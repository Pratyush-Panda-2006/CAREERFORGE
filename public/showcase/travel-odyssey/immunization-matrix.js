/**
 * Travel Odyssey - Expedition Health Advisory & Immunization Risk Matrix
 * Clinical travel medicine dataset and decision engine for global wilderness expeditions.
 */

export const DESTINATION_HEALTH_DATA = {
  'sub-saharan-africa': {
    id: 'sub-saharan-africa',
    name: 'Sub-Saharan Africa (Kenya, Tanzania, DR Congo, Ghana)',
    region: 'East & Central Africa',
    riskLevel: 'high',
    riskBadge: 'HIGH RISK • TROPICAL & VECTOR ENDEMIC',
    minLeadTimeWeeks: 6,
    idealLeadTimeWeeks: 8,
    mandatoryVaccines: [
      {
        name: 'Yellow Fever',
        requirement: 'Mandatory International Certificate of Vaccination (ICVP)',
        timing: 'At least 10 days before entry',
        details: 'Single dose provides lifetime immunity. Border authorities strictly check yellow fever cards upon arrival.'
      }
    ],
    recommendedVaccines: [
      { name: 'Typhoid', type: 'Injectable or Oral', protection: 'Enteric fever transmitted through contaminated water/food' },
      { name: 'Hepatitis A', type: '2-dose series', protection: 'Viral liver infection from food and beverage sources' },
      { name: 'Rabies (Pre-exposure)', type: '3-dose series', protection: 'Safaris and rural areas with bats, stray canines, and primates' },
      { name: 'Meningococcal (ACWY)', type: 'Single dose', protection: 'Essential when traveling through the African Meningitis Belt' },
      { name: 'Cholera', type: 'Oral vaccine (Dukoral)', protection: 'For humanitarian or backcountry expeditions with compromised sanitation' }
    ],
    routineBoosters: [
      { name: 'Tdap (Tetanus, Diphtheria, Pertussis)', note: 'Booster within past 10 years (past 5 years if deep puncture wound)' },
      { name: 'Polio (IPV)', note: 'One-time adult booster recommended for high-risk transmission zones' },
      { name: 'MMR (Measles, Mumps, Rubella)', note: 'Ensure 2 documented lifetime doses' }
    ],
    malariaGuidance: {
      risk: 'High Year-Round Risk',
      prophylaxis: 'Atovaquone-proguanil (Malarone) or Doxycycline daily',
      timing: 'Start 1-2 days before arrival; continue daily and for 7 days (Malarone) or 28 days (Doxy) post-departure',
      precautions: 'Permethrin-treated bed nets, 30-50% DEET insect repellent, long sleeves after sunset.'
    },
    emergencyClinics: [
      {
        facility: 'The Nairobi Hospital Travel & Emergency Center',
        location: 'Argwings Kodhek Rd, Nairobi, Kenya',
        phone: '+254 20 2845000',
        capabilities: 'ICU, Anti-venom bank, Level 1 Trauma, Medevac Helipad'
      },
      {
        facility: 'AMREF Flying Doctors 24/7 Control Center',
        location: 'Wilson Airport, Nairobi, Kenya',
        phone: '+254 20 6992000',
        capabilities: 'Air Ambulance evacuation across East & Central Africa'
      }
    ]
  },
  'amazon-basin': {
    id: 'amazon-basin',
    name: 'Amazon Rainforest Basin (Brazil, Peru, Colombia, Ecuador)',
    region: 'South American Rainforest',
    riskLevel: 'high',
    riskBadge: 'HIGH RISK • VECTOR & ZOONOTIC',
    minLeadTimeWeeks: 4,
    idealLeadTimeWeeks: 6,
    mandatoryVaccines: [
      {
        name: 'Yellow Fever',
        requirement: 'Mandatory / Strongly Required for Jungle Regions',
        timing: 'Administer at least 10 days before river embarkation',
        details: 'Endemic sylvatic yellow fever transmission in canopy jungle basins.'
      }
    ],
    recommendedVaccines: [
      { name: 'Hepatitis A & B', type: 'Twinrix combination', protection: 'Food and blood/fluid pathogen protection' },
      { name: 'Typhoid', type: 'Polysaccharide vaccine', protection: 'Protects against Salmonella enterica serotype typhi' },
      { name: 'Rabies (Pre-exposure)', type: '3-dose schedule', protection: 'Crucial due to vampire bat bites and wild jungle mammals' }
    ],
    routineBoosters: [
      { name: 'Tdap', note: 'Vital due to high risk of soil contamination and puncture thorns' },
      { name: 'Influenza', note: 'Year-round tropical transmission cycle' }
    ],
    malariaGuidance: {
      risk: 'High in Loreto, Acre, Amazonas, & Madre de Dios',
      prophylaxis: 'Atovaquone-proguanil or Artemisinin-combination standby',
      timing: 'Start prior to entering jungle; complete entire course',
      precautions: 'Picaridin or DEET repellent, permethrin clothing, head net in dense brush.'
    },
    emergencyClinics: [
      {
        facility: 'Hospital Regional de Loreto',
        location: 'Av. 28 de Julio, Iquitos, Peru',
        phone: '+51 65 264000',
        capabilities: 'Tropical medicine infectious diseases ward, Snakebite anti-venom'
      },
      {
        facility: 'Hospital Adventista de Manaus',
        location: 'Distrito Industrial, Manaus, Brazil',
        phone: '+55 92 2123 1313',
        capabilities: 'Trauma ICU, Riverboat medevac coordination'
      }
    ]
  },
  'himalayas': {
    id: 'himalayas',
    name: 'Himalayan High Altitude (Nepal, Bhutan, Tibet, Ladakh)',
    region: 'High Himalayas & Karakoram',
    riskLevel: 'moderate',
    riskBadge: 'MODERATE RISK • ALTITUDE & WATER-BORNE',
    minLeadTimeWeeks: 4,
    idealLeadTimeWeeks: 6,
    mandatoryVaccines: [],
    recommendedVaccines: [
      { name: 'Typhoid', type: 'Injectable Vi vaccine', protection: 'Very high incidence in teahouse and tap water systems' },
      { name: 'Hepatitis A', type: 'Inactivated vaccine', protection: 'Essential for all Himalayan trekking routes' },
      { name: 'Japanese Encephalitis', type: '2-dose series (Ixiaro)', protection: 'Recommended if transiting Terai lowlands or rural valleys' },
      { name: 'Rabies', type: 'Pre-exposure prophylaxis', protection: 'Stray temple dogs and macaque monkey encounters along trails' }
    ],
    routineBoosters: [
      { name: 'Tdap (Tetanus)', note: 'Critical for trail scrapes, crampon cuts, and yak-track terrain' },
      { name: 'Polio Booster', note: 'Recommended for prolonged rural Nepal/India trekking' }
    ],
    malariaGuidance: {
      risk: 'Low to Zero at high altitude (>2,000m / 6,560ft)',
      prophylaxis: 'Only needed if spending overnight stays in southern Terai or Pokhara foothills',
      timing: 'Focus primary medical preparation on AMS (Acetazolamide / Diamox)',
      precautions: 'Water purification tablets, SteriPEN UV, 0.2 micron microfilter bottle.'
    },
    emergencyClinics: [
      {
        facility: 'CIWEC Hospital and Travel Medicine Center',
        location: 'British Embassy Road, Kathmandu, Nepal',
        phone: '+977 1 4424111',
        capabilities: 'Gold standard international altitude and tropical medicine clinic'
      },
      {
        facility: 'Himalayan Rescue Association (HRA) Pheriche Clinic',
        location: 'Pheriche (4,240m), Everest Trekking Route',
        phone: '+977 1 4440292',
        capabilities: 'Hyperbaric Gamow bags, Emergency O2, High-altitude pulmonary edema treatment'
      }
    ]
  },
  'southeast-asia': {
    id: 'southeast-asia',
    name: 'Southeast Asia Valleys (Thailand, Vietnam, Cambodia, Indonesia)',
    region: 'Tropical Southeast Asia',
    riskLevel: 'moderate',
    riskBadge: 'MODERATE RISK • DENGUE & FOOD-BORNE',
    minLeadTimeWeeks: 4,
    idealLeadTimeWeeks: 6,
    mandatoryVaccines: [
      {
        name: 'Yellow Fever (Conditional)',
        requirement: 'Proof required ONLY if arriving from yellow fever endemic nations',
        timing: '10 days prior',
        details: 'Standard WHO entry inspection.'
      }
    ],
    recommendedVaccines: [
      { name: 'Hepatitis A', type: 'Inactivated', protection: 'Street food and remote island culinary safety' },
      { name: 'Typhoid', type: 'Injectable', protection: 'Protection against enteric fever' },
      { name: 'Japanese Encephalitis', type: 'Ixiaro vaccine', protection: 'Agricultural zones and flooded rice paddy trekking' },
      { name: 'Rabies', type: '3-dose', protection: 'High volume of street dogs and wildlife interactions' }
    ],
    routineBoosters: [
      { name: 'MMR & Varicella', note: 'Ensure full immunity in high population density transit hubs' },
      { name: 'Tdap', note: 'Standard booster' }
    ],
    malariaGuidance: {
      risk: 'Low in major urban centers; Moderate in deep forested border regions',
      prophylaxis: 'Doxycycline or Atovaquone/Proguanil for border rainforests',
      timing: 'Dengue is the primary vector risk (transmitted by daytime Aedes mosquitoes)',
      precautions: 'Rigorous daytime mosquito repellent, air-conditioned lodging.'
    },
    emergencyClinics: [
      {
        facility: 'Bangkok Hospital International Medical Center',
        location: '2 Soi Soonvijai 7, Bangkok, Thailand',
        phone: '+66 2 310 3000',
        capabilities: 'JCI-accredited tertiary medical hospital, Multi-language emergency hotline'
      },
      {
        facility: 'SOS Medika Clinic Bali',
        location: 'Jl. Bypass Ngurah Rai, Kuta, Bali',
        phone: '+62 361 720100',
        capabilities: '24/7 International medevac dispatch and emergency clinic'
      }
    ]
  },
  'arctic-polar': {
    id: 'arctic-polar',
    name: 'Arctic & Polar Wilderness (Svalbard, Greenland, Antarctica)',
    region: 'Circumpolar & Polar',
    riskLevel: 'extreme',
    riskBadge: 'EXTREME ENVIRONMENT • REMOTE MEDEVAC RESTRICTIONS',
    minLeadTimeWeeks: 8,
    idealLeadTimeWeeks: 12,
    mandatoryVaccines: [
      {
        name: 'Expedition Medical & Dental Clearance',
        requirement: 'Mandatory Physician & Dental Certification Form',
        timing: '6-8 weeks prior to polar vessel boarding',
        details: 'Emergency dental surgery is impossible in pack ice; all crowns and fillings must be certified.'
      }
    ],
    recommendedVaccines: [
      { name: 'Influenza (Quadrivalent)', type: 'Annual formulation', protection: 'Crucial in enclosed ship cabins and polar research bases' },
      { name: 'COVID-19 Bivalent Booster', type: 'mRNA formulation', protection: 'Prevent respiratory illness in extreme isolated cold' },
      { name: 'Pneumococcal', type: 'Prevnar-20', protection: 'Lung protection in sub-zero breathing environments' }
    ],
    routineBoosters: [
      { name: 'Tdap', note: 'Mandatory current tetanus coverage for cold metallic rigging and skidoo operations' }
    ],
    malariaGuidance: {
      risk: 'Zero Risk (Sub-zero climate supports no insect vectors)',
      prophylaxis: 'Not required',
      timing: 'Focus medical kit on frostbite, hypothermia, trauma dressings, and seabag seasickness (Scopolamine)',
      precautions: 'Polar survival suit, windproof goggles with UV400 protection (snow blindness prevention).'
    },
    emergencyClinics: [
      {
        facility: 'Longyearbyen Hospital (Universitetssykehuset Nord-Norge)',
        location: 'Vei 201, Longyearbyen, Svalbard (Norway)',
        phone: '+47 79 02 42 00',
        capabilities: 'Worlds northernmost hospital; surgical stabilization and air ambulance to Tromso'
      },
      {
        facility: 'Antarctic Logistics & Medical Control (ALCI / IAATO Dispatch)',
        location: 'Punta Arenas, Chile & Cape Town, South Africa',
        phone: '+56 61 224 8150',
        capabilities: 'Ski-equipped Twin Otter medevac dispatch weather permitting'
      }
    ]
  }
};

export class TravelImmunizationEngine {
  constructor(dataset = DESTINATION_HEALTH_DATA) {
    this.dataset = dataset;
  }

  getDestination(destinationKey) {
    return this.dataset[destinationKey] || null;
  }

  getAllDestinations() {
    return Object.values(this.dataset);
  }

  calculateLeadTimeAssessment(destinationKey, departureDateStr) {
    const dest = this.getDestination(destinationKey);
    if (!dest) {
      throw new Error(`Unknown destination: ${destinationKey}`);
    }

    if (!departureDateStr) {
      return {
        hasDate: false,
        daysRemaining: null,
        weeksRemaining: null,
        status: 'pending',
        message: 'Select planned departure date to evaluate clinical preparation schedule.'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const departure = new Date(departureDateStr);
    departure.setHours(0, 0, 0, 0);

    const diffMs = departure.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeksRemaining = Number((daysRemaining / 7).toFixed(1));

    if (daysRemaining < 0) {
      return {
        hasDate: true,
        daysRemaining,
        weeksRemaining: 0,
        status: 'expired',
        badgeClass: 'status-danger',
        message: 'Departure date is in the past. Please select an upcoming expedition date.'
      };
    }

    if (weeksRemaining < dest.minLeadTimeWeeks) {
      return {
        hasDate: true,
        daysRemaining,
        weeksRemaining,
        status: 'critical_shortage',
        badgeClass: 'status-danger',
        message: `URGENT: ${weeksRemaining} weeks remaining. Minimum recommended lead time is ${dest.minLeadTimeWeeks} weeks. Certain multi-dose vaccines (Rabies, Hep B, Yellow Fever 10-day rule) require immediate expedited clinical scheduling!`
      };
    }

    if (weeksRemaining < dest.idealLeadTimeWeeks) {
      return {
        hasDate: true,
        daysRemaining,
        weeksRemaining,
        status: 'optimal_window',
        badgeClass: 'status-warning',
        message: `ON TRACK: ${weeksRemaining} weeks remaining. You are within the active clinical window (ideal: ${dest.idealLeadTimeWeeks} weeks). Book your travel health clinic consult this week.`
      };
    }

    return {
      hasDate: true,
      daysRemaining,
      weeksRemaining,
      status: 'ample_time',
      badgeClass: 'status-success',
      message: `PLENTY OF TIME: ${weeksRemaining} weeks remaining until departure. You have ample lead time to complete any multi-dose immunization schedules comfortably.`
    };
  }

  generateAdvisoryBrief(destinationKey, departureDateStr = '') {
    const dest = this.getDestination(destinationKey);
    if (!dest) return '';

    const assessment = this.calculateLeadTimeAssessment(destinationKey, departureDateStr);
    const lines = [
      `=== EXPEDITION MEDICAL & IMMUNIZATION ADVISORY BRIEF ===`,
      `Destination: ${dest.name}`,
      `Risk Classification: ${dest.riskBadge}`,
      `Lead Time: ${assessment.message}`,
      ``,
      `[1] MANDATORY VACCINES & ENTRY CLEARANCE:`,
      dest.mandatoryVaccines.length > 0
        ? dest.mandatoryVaccines.map(v => `- ${v.name}: ${v.requirement} (${v.details})`).join('\n')
        : `- None mandatory at international border.`,
      ``,
      `[2] RECOMMENDED TRAVEL VACCINATIONS:`,
      dest.recommendedVaccines.map(v => `- ${v.name} (${v.type}): ${v.protection}`).join('\n'),
      ``,
      `[3] ROUTINE ADULT BOOSTERS:`,
      dest.routineBoosters.map(b => `- ${b.name}: ${b.note}`).join('\n'),
      ``,
      `[4] MALARIA & VECTOR PROPHYLAXIS:`,
      `- Risk Level: ${dest.malariaGuidance.risk}`,
      `- Medication: ${dest.malariaGuidance.prophylaxis}`,
      `- Protocol: ${dest.malariaGuidance.timing}`,
      `- Barrier Precautions: ${dest.malariaGuidance.precautions}`,
      ``,
      `[5] EMERGENCY CLINICAL EVACUATION CONTACTS:`,
      dest.emergencyClinics.map(c => `- ${c.facility} | Tel: ${c.phone} | ${c.capabilities}`).join('\n'),
      `======================================================`
    ];

    return lines.join('\n');
  }
}
