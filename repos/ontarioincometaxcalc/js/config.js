/**
 * config.js — OntarioIncomeTaxCalc.ca Central Tax Configuration
 * Tax Year: 2026
 * Jurisdiction: Canada → Ontario (employment income only)
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR ALL RATES, BRACKETS, AND THRESHOLDS.
 * To update for a new tax year: edit ONLY this file.
 * All calculator logic and displayed values reference this file exclusively.
 * Zero rates, thresholds, or dollar amounts may appear in index.html or calculator.js.
 *
 * Sources:
 *   CRA T4032-ON: https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html
 *   CRA Individual tax rates: https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html
 *   ESDC EI 2026: https://www.canada.ca/en/employment-social-development/news/2025/09/canada-employment-insurance-commission-sets-the-2026-employment-insurance-premium-rate.html
 *   Ontario Health Premium: https://www.ontario.ca/document/2024-ontario-budget/annex-tax-measures-details#section-6
 */

const TAX_CONFIG = {

  // ── Tax Year Metadata ──────────────────────────────────────────────────────
  taxYear: 2026,
  lastUpdated: "May 2026",
  yearChangeNote: "The federal bottom bracket rate was reduced from 15% to 14% effective July 1, 2025. This applies to the full 2026 tax year.",
  jurisdiction: "Ontario, Canada",
  incomeType: "Employment income only",

  // ── Source URLs ────────────────────────────────────────────────────────────
  sources: {
    craT4032: "https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html",
    craT4032July: "https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-july/t4032on-july-general-information.html",
    craBrackets: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
    esdc: "https://www.canada.ca/en/employment-social-development/news/2025/09/canada-employment-insurance-commission-sets-the-2026-employment-insurance-premium-rate.html",
    ontarioOHP: "https://www.ontario.ca/page/ontario-health-premium"
  },

  // ── Federal Income Tax ─────────────────────────────────────────────────────
  federal: {
    brackets: [
      { min: 0,       max: 58523,   rate: 0.14   },
      { min: 58523,   max: 117045,  rate: 0.205  },
      { min: 117045,  max: 181440,  rate: 0.26   },
      { min: 181440,  max: 258482,  rate: 0.29   },
      { min: 258482,  max: Infinity, rate: 0.33  }
    ],
    // Basic Personal Amount (full; phases down above bpaPhaseoutStart)
    bpa: 16452,
    bpaBase: 14829,
    bpaAdditional: 1623,
    bpaPhaseoutStart: 181440,
    bpaPhaseoutEnd: 258482,
    // Non-refundable credit rate = lowest bracket rate
    creditRate: 0.14
  },

  // ── Ontario Provincial Income Tax ─────────────────────────────────────────
  ontario: {
    brackets: [
      { min: 0,       max: 53891,   rate: 0.0505 },
      { min: 53891,   max: 107785,  rate: 0.0915 },
      { min: 107785,  max: 150000,  rate: 0.1116 },
      { min: 150000,  max: 220000,  rate: 0.1216 },
      { min: 220000,  max: Infinity, rate: 0.1316 }
    ],
    // Ontario Basic Personal Amount
    bpa: 12989,
    creditRate: 0.0505,
    // Ontario Surtax — applied to basic Ontario tax (NOT to income)
    // Source: CRA T4032-ON July 2025 edition
    surtax: {
      threshold1: 5818,   // 20% surtax on basic Ontario tax above this
      rate1: 0.20,
      threshold2: 7446,   // Additional 36% surtax on basic Ontario tax above this
      rate2: 0.36
    }
  },

  // ── Ontario Health Premium ─────────────────────────────────────────────────
  // Applied at tax filing time — NOT a payroll deduction
  // Source: ontario.ca
  ohp: [
    { min: 0,       max: 20000,  fixed: 0,   marginalRate: 0,    marginalBase: 0,     cap: 0   },
    { min: 20000,   max: 25000,  fixed: 0,   marginalRate: 0.06, marginalBase: 20000, cap: 300  },
    { min: 25000,   max: 36000,  fixed: 300, marginalRate: 0,    marginalBase: 0,     cap: 300  },
    { min: 36000,   max: 38500,  fixed: 300, marginalRate: 0.06, marginalBase: 36000, cap: 450  },
    { min: 38500,   max: 48000,  fixed: 450, marginalRate: 0,    marginalBase: 0,     cap: 450  },
    { min: 48000,   max: 48600,  fixed: 450, marginalRate: 0.25, marginalBase: 48000, cap: 600  },
    { min: 48600,   max: 72000,  fixed: 600, marginalRate: 0,    marginalBase: 0,     cap: 600  },
    { min: 72000,   max: 72600,  fixed: 600, marginalRate: 0.25, marginalBase: 72000, cap: 750  },
    { min: 72600,   max: 200000, fixed: 750, marginalRate: 0,    marginalBase: 0,     cap: 750  },
    { min: 200000,  max: 200600, fixed: 750, marginalRate: 0.25, marginalBase: 200000, cap: 900 },
    { min: 200600,  max: Infinity, fixed: 900, marginalRate: 0,  marginalBase: 0,     cap: 900  }
  ],

  // ── Canada Pension Plan (CPP) ──────────────────────────────────────────────
  // Source: CRA T4032-ON 2026
  cpp: {
    basicExemption: 3500,
    ympe: 74600,             // CPP1 ceiling (Year's Maximum Pensionable Earnings)
    yampe: 85000,            // CPP2 ceiling (Year's Additional Maximum Pensionable Earnings)
    rate1: 0.0595,           // CPP1 employee rate
    rate2: 0.04,             // CPP2 employee rate (on earnings between YMPE and YAMPE)
    maxContribution1: 4230.45,
    maxContribution2: 416.00,
    // Note: CPP1 generates a non-refundable tax credit (at federal creditRate and Ontario creditRate)
    // Note: CPP2 does NOT generate a non-refundable tax credit
  },

  // ── Employment Insurance (EI) ──────────────────────────────────────────────
  // Source: ESDC 2026 premium announcement
  ei: {
    rate: 0.0163,            // Employee rate per dollar of insurable earnings
    maxInsurableEarnings: 68900,
    maxPremium: 1123.07
    // EI premiums generate a non-refundable tax credit at federal creditRate and Ontario creditRate
  }

};
