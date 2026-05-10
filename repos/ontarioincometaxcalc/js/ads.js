// ads.js — standardized ad handling for Calc-HQ network
// Rules:
//   1. Ad slots stay hidden unless explicitly activated
//   2. Inline AdSense units (.adsense-unit) collapse to height:0 when inactive
//   3. .active is ONLY added when a real ad is visible (iframe ≥50px tall, ≥100px wide)
//   4. Tracking iframes (0–13px) must NEVER trigger activation
//   5. No delayed layout shift — inactive slots stay at zero height permanently
(function () {
  var cfg = window.SITE_CONFIG || {};

  // Sponsor slot
  var sponsor = document.getElementById("sponsor");
  if (sponsor) {
    if (cfg.SPONSOR_ACTIVE && cfg.SPONSOR_TEXT) {
      sponsor.classList.remove("is-off");
      sponsor.textContent = cfg.SPONSOR_TEXT;
      if (cfg.SPONSOR_HREF) {
        sponsor.style.cursor = "pointer";
        sponsor.onclick = function () { window.location.href = cfg.SPONSOR_HREF; };
      }
    } else {
      sponsor.classList.add("is-off");
    }
  }

  // Config-driven ad slot mounting (#adTop, #adBottom)
  function mountAd(containerId, slotId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!cfg.ADS_ACTIVE || !slotId) {
      el.classList.add("is-off");
      return;
    }
    el.classList.remove("is-off");

    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", cfg.ADSENSE_PUB_ID);
    ins.setAttribute("data-ad-slot", slotId);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    el.appendChild(ins);

    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}

    setTimeout(function () {
      if (!el.querySelector("iframe")) el.classList.add("is-off");
    }, 1500);
  }

  mountAd("adTop", cfg.AD_SLOT_TOP);
  mountAd("adBottom", cfg.AD_SLOT_BOTTOM);

  // Inline AdSense units (.adsense-unit):
  // Only activate when a REAL ad is confirmed — visible, measurable content.
  // An iframe alone is NOT sufficient. AdSense injects tracking iframes with
  // zero visual content that still report offsetWidth > 0.
  // Safe default: do NOT activate unless iframe is ≥50px tall AND ≥100px wide.
  document.addEventListener("DOMContentLoaded", function () {
    var units = document.querySelectorAll(".adsense-unit");
    units.forEach(function (unit) {
      var ins = unit.querySelector("ins.adsbygoogle");
      if (!ins) return;

      setTimeout(function () {
        try {
          var iframe = ins.querySelector("iframe");
          if (!iframe) return;

          // Strict activation: real ads are at least 50px tall and 100px wide
          var ih = iframe.offsetHeight || 0;
          var iw = iframe.offsetWidth || 0;

          if (ih >= 50 && iw >= 100) {
            unit.classList.add("active");
          }
        } catch (e) {}
      }, 3000);
    });
  });
})();
