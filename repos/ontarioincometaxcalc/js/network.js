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

(function () {
  var SELF = "ontarioincometaxcalc.ca";

  function renderFooter() {
    var el = document.getElementById("network-footer");
    if (!el) return;
    var tools = NETWORK_TOOLS.filter(function (t) { return t.live && t.url.indexOf(SELF) === -1; });
    var toolLinks = tools.map(function (t) {
      return '<a href="' + t.url + '" rel="noopener">' + t.name + '</a>';
    }).join("");
    el.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid footer-grid-4">' +
          '<div class="footer-col">' +
            '<h4>PAGES</h4>' +
            '<a href="index.html">Home</a>' +
            '<a href="faq.html">FAQ</a>' +
            '<a href="about.html">About</a>' +
            '<a href="contact.html">Contact</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>LEGAL</h4>' +
            '<a href="privacy-policy.html">Privacy Policy</a>' +
            '<a href="disclaimer.html">Disclaimer</a>' +
            '<a href="terms.html">Terms of Use</a>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>RELATED TOOLS</h4>' +
            toolLinks +
          '</div>' +
          '<div class="footer-col">' +
            '<h4>MORE TOOLS</h4>' +
            '<a href="https://calc-hq.ca" class="more-tools-link" target="_blank" rel="noopener noreferrer">' +
              '<span class="more-tools-title">Calc-HQ.ca</span>' +
              '<span class="subtext">Canadian payroll, tax, and contribution calculators</span>' +
            '</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span>© 2026 OntarioIncomeTaxCalc.ca — All calculations run in your browser. No data stored.</span>' +
        '</div>' +
      '</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderFooter();
  });
})();
