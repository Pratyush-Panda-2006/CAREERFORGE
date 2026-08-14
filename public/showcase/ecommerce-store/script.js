let count = 0;

function addToCart(itemName) {
  count++;
  document.getElementById('cartCount').innerText = count;
  
  const toast = document.getElementById('toast');
  toast.innerText = `Added ${itemName} to cart!`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const cat = tab.getAttribute('data-cat');
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
      if (cat === 'all' || card.getAttribute('data-category') === cat) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
});
