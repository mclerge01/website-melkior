/* ==========================================================================
   Public site behavior - vanilla JS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const nav = document.getElementById("site-nav");
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  function setLocaleCookie(locale) {
    if (!locale) return;
    document.cookie = `melkior_locale=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
  }

  document.querySelectorAll("[data-locale-target]").forEach((link) => {
    link.addEventListener("click", () => setLocaleCookie(link.dataset.localeTarget));
  });

  if (hamburger && navMenu) {
    function closeMenu() {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
      if (nav) nav.classList.remove("menu-open");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    function openMenu() {
      hamburger.classList.add("active");
      navMenu.classList.add("active");
      if (nav) nav.classList.add("menu-open");
      hamburger.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }

    hamburger.addEventListener("click", () => {
      if (navMenu.classList.contains("active")) closeMenu();
      else openMenu();
    });

    navMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navMenu.classList.contains("active")) closeMenu();
    });
  }

  if (nav) {
    const updateNav = () => {
      if (window.scrollY > 24) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const offset = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  const calculator = document.querySelector(".calculator-card");
  if (calculator) {
    const result = calculator.querySelector("[data-payment-result]");
    const formatter = new Intl.NumberFormat(body.dataset.locale || "fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });

    function calculatePayment() {
      const amount = Number(calculator.elements.amount.value) || 0;
      const annualRate = Number(calculator.elements.rate.value) || 0;
      const years = Number(calculator.elements.years.value) || 0;
      const frequency = calculator.elements.frequency.value;
      const months = Math.max(years * 12, 1);
      const monthlyRate = annualRate / 100 / 12;
      let monthly;

      if (monthlyRate === 0) monthly = amount / months;
      else {
        const factor = Math.pow(1 + monthlyRate, months);
        monthly = amount * ((monthlyRate * factor) / (factor - 1));
      }

      const payment = frequency === "biweekly" ? (monthly * 12) / 26 : monthly;
      result.textContent = formatter.format(Number.isFinite(payment) ? payment : 0);
    }

    calculator.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", calculatePayment));
    calculatePayment();
  }

  const modal = document.getElementById("form-modal");
  const modalIcon = document.getElementById("form-modal-icon");
  const modalMessage = document.getElementById("form-modal-message");
  const modalClose = document.getElementById("form-modal-close");

  function getModalTitle(success) {
    const isEnglish = body.dataset.locale === "en-CA";
    if (success) return isEnglish ? "Message sent" : "Message envoyé";
    return isEnglish ? "Error" : "Erreur";
  }

  function showModal(success, message, options = {}) {
    if (!modal || !modalIcon || !modalMessage) return;
    modal.classList.toggle("modal-phone", options.variant === "phone");
    modalIcon.textContent = options.title || getModalTitle(success);
    modalIcon.style.color = options.titleColor || (success ? "var(--color-success)" : "var(--color-error)");
    modalMessage.textContent = message;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  function isMobileDialerLikely() {
    const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    return coarsePointer || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  }

  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.addEventListener("click", async (event) => {
      if (isMobileDialerLikely()) return;

      event.preventDefault();
      const phone = link.dataset.phoneNumber || link.textContent.trim();
      const isEnglish = body.dataset.locale === "en-CA";
      const message = isEnglish
        ? "Use this number to call Melkior from your phone. It was copied if your browser allows it."
        : "Utilisez ce numéro pour appeler Melkior depuis votre téléphone. Il a été copié si votre navigateur le permet.";

      try {
        if (window.navigator.clipboard) await window.navigator.clipboard.writeText(phone);
      } catch {
        // Clipboard access is optional; the modal still gives the visitor the number.
      }

      showModal(true, message, {
        title: phone,
        titleColor: "var(--color-primary)",
        variant: "phone",
      });
    });
  });

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const submit = contactForm.querySelector('button[type="submit"]');
    const originalText = submit ? submit.textContent : "";
    const messages = {
      sending: contactForm.dataset.sending || "Sending...",
      success: contactForm.dataset.success || "Message sent.",
      error: contactForm.dataset.error || "An error occurred.",
      network: contactForm.dataset.networkError || "Connection error.",
    };

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });

      if (data.bot_field) {
        showModal(true, messages.success);
        contactForm.reset();
        return;
      }

      const turnstileInput = contactForm.querySelector('input[name="cf-turnstile-response"]');
      if (turnstileInput && turnstileInput.value) data.turnstileToken = turnstileInput.value;
      else if (window.turnstile && typeof window.turnstile.getResponse === "function") {
        const token = window.turnstile.getResponse();
        if (token) data.turnstileToken = token;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = messages.sending;
      }

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          showModal(true, result.message || messages.success);
          contactForm.reset();
          if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
        } else {
          showModal(false, result.error || messages.error);
        }
      } catch {
        showModal(false, messages.network);
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText;
        }
      }
    });
  }

  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  if ("IntersectionObserver" in window && revealElements.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("revealed"));
  }
});
