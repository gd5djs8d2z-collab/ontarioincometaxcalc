/**
 * calculator.js — OntarioIncomeTaxCalc.ca Calculation Engine
 * Reads exclusively from TAX_CONFIG (js/config.js).
 * Zero hardcoded rates, thresholds, or dollar amounts in this file.
 *
 * All formulas derived from CRA T4032-ON and CRA published methodology.
 */
(function () {
  "use strict";

  const C = TAX_CONFIG;

  // ── Utility ────────────────────────────────────────────────────────────────

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function fmt(n) {
    return "$" + round2(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function fmtPct(r) {
    return (r * 100).toFixed(1) + "%";
  }

  // ── Federal BPA (with phase-down for high incomes) ─────────────────────────
  // Above bpaPhaseoutStart, the additional BPA amount phases out linearly
  // reaching bpaBase at bpaPhaseoutEnd. Below phaseout: full bpa applies.

  function getFederalBPA(grossIncome) {
    const f = C.federal;
    if (grossIncome <= f.bpaPhaseoutStart) return f.bpa;
    if (grossIncome >= f.bpaPhaseoutEnd) return f.bpaBase;
    const fraction = (grossIncome - f.bpaPhaseoutStart) / (f.bpaPhaseoutEnd - f.bpaPhaseoutStart);
    return f.bpa - fraction * f.bpaAdditional;
  }

  // ── Progressive Bracket Calculator ────────────────────────────────────────
  // Returns { totalTax, bracketRows, marginalRate }
  // bracketRows: array of { min, max, rate, incomeInBracket, taxInBracket, cumulative }

  function calcBracketTax(taxableIncome, brackets) {
    let total = 0;
    let marginalRate = brackets[0].rate;
    const rows = [];

    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      if (taxableIncome <= b.min) {
        rows.push({ min: b.min, max: b.max, rate: b.rate, incomeInBracket: 0, taxInBracket: 0, cumulative: total });
        continue;
      }
      const upper = Math.min(taxableIncome, b.max === Infinity ? taxableIncome : b.max);
      const incomeInBracket = Math.max(0, upper - b.min);
      const taxInBracket = incomeInBracket * b.rate;
      total += taxInBracket;
      if (incomeInBracket > 0) marginalRate = b.rate;
      rows.push({ min: b.min, max: b.max, rate: b.rate, incomeInBracket: incomeInBracket, taxInBracket: taxInBracket, cumulative: total });
    }

    return { totalTax: round2(total), bracketRows: rows, marginalRate: marginalRate };
  }

  // ── CPP Calculation ────────────────────────────────────────────────────────
  // CPP1: on (income - basicExemption) up to YMPE, at rate1
  // CPP2: on income between YMPE and YAMPE, at rate2
  // Both capped at their respective maxContribution values

  function calcCPP(grossIncome) {
    const cpp = C.cpp;
    const cpp1Base = Math.max(0, Math.min(grossIncome, cpp.ympe) - cpp.basicExemption);
    // Split CPP1 into base (4.95%) and first additional (1.00%) per CRA T4032-ON
    // CPP base: non-refundable credit only (not deducted from taxable income)
    // CPP first additional: deduction from taxable income only (not a credit)
    const cppBase = round2(Math.min(cpp1Base * cpp.rateBase, cpp.maxContributionBase));
    const cppAdditional = round2(Math.min(cpp1Base * cpp.rateAdditional, cpp.maxContributionAdditional));
    const cpp1 = round2(cppBase + cppAdditional);

    const cpp2Base = Math.max(0, Math.min(grossIncome, cpp.yampe) - cpp.ympe);
    const cpp2 = round2(Math.min(cpp2Base * cpp.rate2, cpp.maxContribution2));

    return { cpp1, cppBase, cppAdditional, cpp2, total: round2(cpp1 + cpp2) };
  }

  // ── EI Calculation ────────────────────────────────────────────────────────
  function calcEI(grossIncome) {
    const ei = C.ei;
    const insurable = Math.min(grossIncome, ei.maxInsurableEarnings);
    return round2(Math.min(insurable * ei.rate, ei.maxPremium));
  }

  // ── Ontario Health Premium ─────────────────────────────────────────────────
  function calcOHP(grossIncome) {
    const bands = C.ohp;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (grossIncome >= b.min && (b.max === Infinity || grossIncome < b.max)) {
        if (b.marginalRate === 0) return round2(b.fixed);
        return round2(Math.min(b.fixed + (grossIncome - b.marginalBase) * b.marginalRate, b.cap));
      }
    }
    return 0;
  }

  // ── Ontario Surtax ────────────────────────────────────────────────────────
  // Applied to basic Ontario tax — NOT to income
  // Two-tier: 20% on basicOntarioTax above threshold1 + 36% on basicOntarioTax above threshold2

  function calcSurtax(basicOntarioTax) {
    const st = C.ontario.surtax;
    const tier1 = Math.max(0, basicOntarioTax - st.threshold1) * st.rate1;
    const tier2 = Math.max(0, basicOntarioTax - st.threshold2) * st.rate2;
    return round2(tier1 + tier2);
  }

  // ── BPA Credit ────────────────────────────────────────────────────────────
  // Non-refundable: credit = BPA × creditRate
  // Reduces tax payable (cannot make tax negative)

  function federalBPACredit(grossIncome) {
    return round2(getFederalBPA(grossIncome) * C.federal.creditRate);
  }

  function ontarioBPACredit() {
    return round2(C.ontario.bpa * C.ontario.creditRate);
  }

  // ── CPP/EI Non-Refundable Credits ─────────────────────────────────────────
  // CPP base generates credits at the federal and Ontario lowest bracket rates
  // CPP first additional does NOT generate a non-refundable tax credit (deduction only)
  // CPP2 does NOT generate a non-refundable tax credit

  function federalCPPBaseCredit(cppBase) {
    return round2(cppBase * C.federal.creditRate);
  }

  function federalEICredit(ei) {
    return round2(ei * C.federal.creditRate);
  }

  // ── Canada Employment Amount (CEA) Credit ────────────────────────────────
  // CEA = lesser of the prescribed amount and employment income
  // Non-refundable credit at the federal creditRate
  // Source: CRA T4032-ON line 10; CRA Line 31260

  function federalCEACredit(grossIncome) {
    const cea = Math.min(C.federal.cea, grossIncome);
    return round2(cea * C.federal.creditRate);
  }

  function ontarioCPPBaseCredit(cppBase) {
    return round2(cppBase * C.ontario.creditRate);
  }

  function ontarioEICredit(ei) {
    return round2(ei * C.ontario.creditRate);
  }

  // ── Full Tax Calculation ───────────────────────────────────────────────────

  function calculate(grossIncome) {
    if (isNaN(grossIncome) || grossIncome < 0) {
      return { error: "INVALID_INCOME" };
    }

    // ── CPP and EI ──
    const cppResult = calcCPP(grossIncome);
    const ei = calcEI(grossIncome);

    // ── Taxable income adjustments ──
    // CPP first additional and EI are deductible for income tax purposes
    // CPP base is NOT deductible (credit only); CPP2 is not deductible
    const taxableIncome = Math.max(0, grossIncome - cppResult.cppAdditional - ei);

    // ── Federal tax ──
    const fedBracket = calcBracketTax(taxableIncome, C.federal.brackets);
    const fedBPACredit = federalBPACredit(grossIncome);
    const fedCPPBaseCredit = federalCPPBaseCredit(cppResult.cppBase);
    const fedEICredit = federalEICredit(ei);
    const fedCEACredit = federalCEACredit(grossIncome);
    const grossFederalTax = fedBracket.totalTax;
    const federalTax = round2(Math.max(0, grossFederalTax - fedBPACredit - fedCPPBaseCredit - fedEICredit - fedCEACredit));

    // ── Ontario tax ──
    const onBracket = calcBracketTax(taxableIncome, C.ontario.brackets);
    const onBPACredit = ontarioBPACredit();
    const onCPPBaseCredit = ontarioCPPBaseCredit(cppResult.cppBase);
    const onEICredit = ontarioEICredit(ei);
    const basicOntarioTax = round2(Math.max(0, onBracket.totalTax - onBPACredit - onCPPBaseCredit - onEICredit));
    const surtax = calcSurtax(basicOntarioTax);
    const provincialTaxExclOHP = round2(basicOntarioTax + surtax);
    const ohp = calcOHP(grossIncome);
    // ── Ontario Tax Reduction ──
    // Source: CRA T4032-ON line 25
    // Reduction formula uses line 22 (provincial tax + surtax, excluding OHP)
    // but the reduction is subtracted from line 24 (which includes OHP)
    // Basic-only (no dependant/disability amounts) per CRA payroll table methodology
    const taxReductionPersonal = C.ontario.taxReduction.basicAmount;
    const taxReduction = Math.min(
      provincialTaxExclOHP,
      Math.max(0, 2 * taxReductionPersonal - provincialTaxExclOHP)
    );
    const totalOntarioTax = round2(provincialTaxExclOHP + ohp - taxReduction);

    // ── OHP ── (already computed above for tax reduction; reuse)
    // ohp computed before tax reduction

    // ── Totals ──
    const totalTax = round2(federalTax + totalOntarioTax);
    const totalDeductions = round2(federalTax + totalOntarioTax + ohp + cppResult.total + ei);
    const netIncome = round2(Math.max(0, grossIncome - totalDeductions));
    const effectiveRate = grossIncome > 0 ? round2((totalTax / grossIncome) * 10000) / 100 : 0;

    // ── BPA amounts for display ──
    const federalBPA = round2(getFederalBPA(grossIncome));
    const federalBPACreditDisplay = round2(federalBPA * C.federal.creditRate);
    const ontarioBPACreditDisplay = ontarioBPACredit();

    // ── $1,000 raise marginal illustration ──
    const raiseAmount = 1000;
    const marginalFedIncrease = round2(raiseAmount * fedBracket.marginalRate);
    const marginalOnIncrease = round2(raiseAmount * onBracket.marginalRate);
    const marginalTotal = round2(marginalFedIncrease + marginalOnIncrease);

    return {
      // inputs
      grossIncome: grossIncome,
      taxableIncome: taxableIncome,
      taxYear: C.taxYear,

      // federal
      federalBPA: federalBPA,
      federalBPACredit: federalBPACreditDisplay,
      federalCPPBaseCredit: fedCPPBaseCredit,
      federalEICredit: fedEICredit,
      federalCEACredit: fedCEACredit,
      grossFederalTax: grossFederalTax,
      federalTax: federalTax,
      federalBracketRows: fedBracket.bracketRows,
      marginalFederalRate: fedBracket.marginalRate,

      // ontario
      ontarioBPA: C.ontario.bpa,
      ontarioBPACredit: ontarioBPACreditDisplay,
      ontarioCPPBaseCredit: onCPPBaseCredit,
      ontarioEICredit: onEICredit,
      basicOntarioTax: basicOntarioTax,
      surtax: surtax,
      surtaxApplies: surtax > 0,
      taxReduction: round2(taxReduction),
      totalOntarioTax: totalOntarioTax,
      ontarioBracketRows: onBracket.bracketRows,
      marginalOntarioRate: onBracket.marginalRate,

      // ohp
      ohp: ohp,

      // cpp
      cppBase: cppResult.cppBase,
      cppAdditional: cppResult.cppAdditional,
      cpp1: cppResult.cpp1,
      cpp2: cppResult.cpp2,
      cppTotal: cppResult.total,

      // ei
      ei: ei,

      // totals
      totalTax: totalTax,
      totalDeductions: totalDeductions,
      netIncome: netIncome,
      effectiveRate: effectiveRate,

      // marginal illustration
      marginalFedIncrease: marginalFedIncrease,
      marginalOnIncrease: marginalOnIncrease,
      marginalTotal: marginalTotal,
      raiseAmount: raiseAmount,

      // display helpers
      fmt: fmt,
      fmtPct: fmtPct
    };
  }

  // ── Expose ─────────────────────────────────────────────────────────────────
  window.OntarioTaxCalc = {
    calculate,
    calcBracketTax,
    calcCPP,
    calcEI,
    calcOHP,
    calcSurtax,
    getFederalBPA,
    federalBPACredit,
    federalCEACredit,
    ontarioBPACredit,
    fmt,
    fmtPct
  };

})();
