/* GA4 - Calc-HQ Network Analytics (single injection point) */
(function(){if(!window.__GA4_LOADED){window.__GA4_LOADED=true;var id="G-W4SWZ1YRS2";var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+id;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}gtag("js",new Date());gtag("config",id);}})();
/**
 * Ontario Income Tax Calc — CA Network Tools Registry
 * Source of truth for all related .ca calculator tools.
 * Only tools with live: true will be displayed.
 * This site must NOT include itself (filtered at render time).
 *
 * Hub: https://calc-hq.ca
 */

const NETWORK_TOOLS = [
  {
    name: "Ontario Take Home Calc",
    desc: "Estimate your Ontario net pay after federal tax, provincial tax, CPP, EI, and OHP.",
    url: "https://ontariotakehomecalc.ca",
    live: true
  },
  {
    name: "Ontario Raise Calc",
    desc: "See exactly how a salary raise changes your Ontario take-home pay after all deductions.",
    url: "https://ontarioraisecalc.ca",
    live: true
  },
  {
    name: "Marginal Tax Calc",
    desc: "Find your Ontario marginal tax rate on additional income — federal + provincial brackets, CPP, EI, and surtax.",
    url: "https://marginaltaxcalc.ca",
    live: true
  }
];
