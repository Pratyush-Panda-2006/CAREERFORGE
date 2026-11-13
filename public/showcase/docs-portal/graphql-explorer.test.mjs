import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/docs-portal/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math,
    Date,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('GraphQL in-memory schema defines User, Project, Issue, and Leaderboard types', () => {
  const ctx = loadContext();
  assert.ok(ctx.GRAPHQL_SCHEMA, 'GRAPHQL_SCHEMA must be exported on window');
  assert.ok(ctx.GRAPHQL_SCHEMA.types.User, 'User type defined');
  assert.ok(ctx.GRAPHQL_SCHEMA.types.Project, 'Project type defined');
  assert.ok(ctx.GRAPHQL_SCHEMA.types.Issue, 'Issue type defined');
  assert.ok(ctx.GRAPHQL_SCHEMA.types.Leaderboard, 'Leaderboard type defined');
  assert.ok(ctx.GRAPHQL_SCHEMA.types.Query, 'Query root type defined');

  assert.ok(ctx.GRAPHQL_MOCK_DATA, 'GRAPHQL_MOCK_DATA must be exported');
  assert.ok(ctx.GRAPHQL_MOCK_DATA.users.length >= 4);
  assert.ok(ctx.GRAPHQL_MOCK_DATA.projects.length >= 3);
  assert.ok(ctx.GRAPHQL_MOCK_DATA.issues.length >= 5);
  assert.ok(ctx.GRAPHQL_MOCK_DATA.leaderboard.length >= 4);
});

test('GraphQL tokenizer and parser parse query into AST', () => {
  const ctx = loadContext();
  const parseGraphQL = ctx.parseGraphQL;
  assert.equal(typeof parseGraphQL, 'function');

  const query = `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
        projects {
          id
          name
        }
      }
    }
  `;
  const ast = parseGraphQL(query);
  assert.equal(ast.operation, 'query');
  assert.equal(ast.name, 'GetUser');
  assert.equal(ast.selectionSet.length, 1);
  assert.equal(ast.selectionSet[0].name, 'user');
  assert.equal(ast.selectionSet[0].arguments.id, '$id');
  assert.equal(ast.selectionSet[0].selectionSet.length, 4);
});

test('GraphQL resolver recursively executes queries and resolves nested relations', () => {
  const ctx = loadContext();
  const GraphQLResolver = ctx.GraphQLResolver;
  const parseGraphQL = ctx.parseGraphQL;
  assert.equal(typeof GraphQLResolver, 'function');

  const resolver = new GraphQLResolver();
  const query = `
    query {
      user(id: "usr_1") {
        id
        name
        role
        projects {
          id
          name
        }
        issues {
          id
          title
          status
        }
      }
    }
  `;
  const ast = parseGraphQL(query);
  const result = resolver.resolve(ast);

  assert.ok(result.data);
  assert.equal(result.data.user.id, 'usr_1');
  assert.equal(result.data.user.name, 'Alex Mercer');
  assert.ok(Array.isArray(result.data.user.projects));
  assert.ok(result.data.user.projects.length >= 2);
  assert.ok(Array.isArray(result.data.user.issues));
  assert.ok(result.data.user.issues.length >= 1);
});

test('GraphQL resolver handles query variables and filtering arguments', () => {
  const ctx = loadContext();
  const GraphQLResolver = ctx.GraphQLResolver;
  const parseGraphQL = ctx.parseGraphQL;
  const resolver = new GraphQLResolver();

  const query = `
    query GetFilteredProjects($status: String) {
      projects(status: $status) {
        id
        name
        status
        issues {
          id
          title
        }
      }
    }
  `;
  const ast = parseGraphQL(query);
  const result = resolver.resolve(ast, { status: 'active' });

  assert.ok(result.data);
  assert.ok(result.data.projects.length >= 2);
  result.data.projects.forEach(p => {
    assert.equal(p.status, 'active');
  });
});

test('GraphQL resolver handles leaderboard query with nested user details', () => {
  const ctx = loadContext();
  const GraphQLResolver = ctx.GraphQLResolver;
  const parseGraphQL = ctx.parseGraphQL;
  const resolver = new GraphQLResolver();

  const query = `
    query {
      leaderboard(limit: 2) {
        rank
        score
        badges
        user {
          name
          email
        }
      }
    }
  `;
  const ast = parseGraphQL(query);
  const result = resolver.resolve(ast);

  assert.ok(result.data);
  assert.equal(result.data.leaderboard.length, 2);
  assert.equal(result.data.leaderboard[0].rank, 1);
  assert.equal(result.data.leaderboard[0].user.name, 'Alex Mercer');
  assert.ok(Array.isArray(result.data.leaderboard[0].badges));
});

test('GraphQL AST syntax highlighter decorates keywords, types, fields, and strings', () => {
  const ctx = loadContext();
  const highlightGraphQL = ctx.highlightGraphQL;
  assert.equal(typeof highlightGraphQL, 'function');

  const query = `query GetIssue($id: ID!) { issue(id: $id) { title status } }`;
  const html = highlightGraphQL(query);

  assert.ok(html.includes('gql-keyword'), 'Contains keyword class');
  assert.ok(html.includes('gql-variable'), 'Contains variable class');
  assert.ok(html.includes('gql-field'), 'Contains field class');
  assert.ok(html.includes('gql-argument'), 'Contains argument class');
});
