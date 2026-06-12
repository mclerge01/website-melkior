/* ==========================================================================
   Public site behavior - vanilla JS
   ========================================================================== */

const MDI_PHONE_IN_TALK_OUTLINE_PATH =
  "M20 15.5C18.8 15.5 17.5 15.3 16.4 14.9H16.1C15.8 14.9 15.6 15 15.4 15.2L13.2 17.4C10.4 15.9 8 13.6 6.6 10.8L8.8 8.6C9.1 8.3 9.2 7.9 9 7.6C8.7 6.5 8.5 5.2 8.5 4C8.5 3.5 8 3 7.5 3H4C3.5 3 3 3.5 3 4C3 13.4 10.6 21 20 21C20.5 21 21 20.5 21 20V16.5C21 16 20.5 15.5 20 15.5M5 5H6.5C6.6 5.9 6.8 6.8 7 7.6L5.8 8.8C5.4 7.6 5.1 6.3 5 5M19 19C17.7 18.9 16.4 18.6 15.2 18.2L16.4 17C17.2 17.2 18.1 17.4 19 17.4V19M15 12H17A5 5 0 0 0 12 7V9A3 3 0 0 1 15 12M19 12H21C21 7 16.97 3 12 3V5C15.86 5 19 8.13 19 12Z";

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

  document.querySelectorAll(".timeline-year").forEach((year) => {
    const value = year.textContent.trim().toLowerCase();
    if (value === "today" || value === "aujourd'hui" || value === "aujourd’hui") {
      year.textContent = String(new Date().getFullYear());
    }
  });

  function isLikelyCrawlerUserAgent() {
    const ua = navigator.userAgent || "";
    return /(bot|crawl|crawler|spider|slurp|bingpreview|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|pinterest|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|anthropic-ai|perplexitybot|perplexity-user|ccbot|google-extended|applebot-extended|bytespider|meta-externalagent|meta-externalfetcher|diffbot|cohere-ai|omgili|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|yandex|baiduspider|duckduckbot|googlebot|bingbot)/i.test(ua);
  }

  function initInstagramWidgets() {
    const widgets = Array.from(document.querySelectorAll("[data-instagram-widget]"));
    if (!widgets.length) return;

    if (isLikelyCrawlerUserAgent()) {
      widgets.forEach((widget) => {
        widget.dataset.embedBlocked = "crawler";
      });
      return;
    }

    const eventOptions = { passive: true };
    let hasLoadedWidgets = false;
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let touchStartY = null;

    function loadWidget(widget) {
      if (!widget || widget.dataset.embedLoaded === "true") return;

      const src = String(widget.dataset.embedSrc || "").trim();
      if (!/^https:\/\/emb\.fouita\.com\/widget\/[a-z0-9]+\/[a-z0-9]+\/?$/i.test(src)) return;

      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = String(widget.dataset.embedTitle || "Carousel Instagram Feed").trim() || "Carousel Instagram Feed";
      iframe.loading = "eager";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allow = "encrypted-media; picture-in-picture; web-share";

      widget.replaceChildren(iframe);
      widget.dataset.embedLoaded = "true";
      widget.classList.add("is-loaded");
    }

    function removeScrollStartListeners() {
      window.removeEventListener("scroll", onScroll, eventOptions);
      window.removeEventListener("wheel", onWheel, eventOptions);
      window.removeEventListener("touchstart", onTouchStart, eventOptions);
      window.removeEventListener("touchmove", onTouchMove, eventOptions);
      window.removeEventListener("keydown", onKeyDown);
    }

    function loadWidgetsAfterUserScroll(event) {
      if (hasLoadedWidgets) return;
      if (event && event.isTrusted === false) return;
      hasLoadedWidgets = true;
      removeScrollStartListeners();
      widgets.forEach(loadWidget);
    }

    function onScroll(event) {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      if (currentScrollY > lastScrollY + 4) {
        loadWidgetsAfterUserScroll(event);
      }
      lastScrollY = currentScrollY;
    }

    function onWheel(event) {
      if (event.deltaY > 0) {
        loadWidgetsAfterUserScroll(event);
      }
    }

    function onTouchStart(event) {
      touchStartY = event.touches?.[0]?.clientY ?? null;
    }

    function onTouchMove(event) {
      if (touchStartY == null) return;
      const currentY = event.touches?.[0]?.clientY;
      if (typeof currentY === "number" && touchStartY - currentY > 8) {
        loadWidgetsAfterUserScroll(event);
      }
    }

    function onKeyDown(event) {
      const scrollKeys = new Set(["ArrowDown", "PageDown", " ", "End"]);
      if (scrollKeys.has(event.key)) {
        loadWidgetsAfterUserScroll(event);
      }
    }

    window.addEventListener("scroll", onScroll, eventOptions);
    window.addEventListener("wheel", onWheel, eventOptions);
    window.addEventListener("touchstart", onTouchStart, eventOptions);
    window.addEventListener("touchmove", onTouchMove, eventOptions);
    window.addEventListener("keydown", onKeyDown);
  }

  function initPagedCarousel(carousel) {
    if (carousel.dataset.carouselReady === "true") return;
    const track = carousel.querySelector("[data-carousel-track]");
    const section = carousel.closest("section");
    const prev = carousel.querySelector("[data-carousel-prev]") || section?.querySelector("[data-carousel-prev]");
    const next = carousel.querySelector("[data-carousel-next]") || section?.querySelector("[data-carousel-next]");
    if (!track) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const intervalMs = Math.max(0, Number(carousel.dataset.carouselInterval || 7000));
    const mode = carousel.dataset.carouselMode || "page";
    let timer = null;
    let paused = false;
    let activeIndex = 0;
    let heightFrame = 0;

    function getItems() {
      return Array.from(track.children);
    }

    function uniquePositions(positions) {
      const normalized = positions.map((position) => Math.max(0, Math.round(position)));
      return normalized.filter((position, index) => index === 0 || Math.abs(position - normalized[index - 1]) > 2);
    }

    function getPages() {
      if (mode === "showcase") {
        return getItems().map((_, index) => index);
      }

      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      if (maxScroll <= 2) return [0];

      if (mode === "item") {
        const itemPages = getItems().map((child) => Math.min(child.offsetLeft, maxScroll));
        return uniquePositions(itemPages);
      }

      const pageWidth = Math.max(1, track.clientWidth);
      const pages = [];
      for (let position = 0; position < maxScroll - 2; position += pageWidth) {
        pages.push(position);
      }
      pages.push(maxScroll);
      return uniquePositions(pages);
    }

    function currentPageIndex(pages = getPages()) {
      if (mode === "showcase") return activeIndex;

      const scrollLeft = track.scrollLeft;
      return pages.reduce((closestIndex, page, index) => {
        return Math.abs(page - scrollLeft) < Math.abs(pages[closestIndex] - scrollLeft) ? index : closestIndex;
      }, 0);
    }

    function measureShowcaseHeight() {
      if (mode !== "showcase") return;
      const items = getItems();
      if (!items.length) return;

      carousel.style.removeProperty("--testimonial-card-height");
      const fallbackHeight = Number.parseFloat(window.getComputedStyle(track).minHeight) || 0;
      const cardWidth = Math.max(
        ...items.map((item) => Number.parseFloat(window.getComputedStyle(item).width) || item.getBoundingClientRect().width),
      );
      if (!Number.isFinite(cardWidth) || cardWidth <= 0) return;

      const measurer = document.createElement("div");
      measurer.setAttribute("aria-hidden", "true");
      Object.assign(measurer.style, {
        position: "absolute",
        top: "0",
        left: "0",
        zIndex: "-1",
        width: "100%",
        overflow: "visible",
        visibility: "hidden",
        pointerEvents: "none",
      });

      const clones = items.map((item) => {
        const clone = item.cloneNode(true);
        clone.classList.remove("is-active", "is-prev", "is-next", "is-hidden");
        clone.removeAttribute("aria-hidden");
        Object.assign(clone.style, {
          position: "static",
          inset: "auto",
          top: "auto",
          left: "auto",
          width: `${Math.ceil(cardWidth)}px`,
          height: "auto",
          minHeight: "0",
          margin: "0",
          opacity: "1",
          visibility: "hidden",
          pointerEvents: "none",
          transform: "none",
          transition: "none",
          filter: "none",
          webkitMaskImage: "none",
          maskImage: "none",
        });
        measurer.appendChild(clone);
        return clone;
      });

      carousel.appendChild(measurer);
      const measuredHeight = Math.max(...clones.map((clone) => clone.getBoundingClientRect().height));
      measurer.remove();

      const nextHeight = Math.ceil(Math.max(fallbackHeight, measuredHeight));
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        carousel.style.setProperty("--testimonial-card-height", `${nextHeight}px`);
      }
    }

    function scheduleShowcaseHeightMeasure() {
      if (mode !== "showcase") return;
      if (heightFrame) window.cancelAnimationFrame(heightFrame);
      heightFrame = window.requestAnimationFrame(() => {
        heightFrame = 0;
        measureShowcaseHeight();
      });
    }

    function updateShowcase(index = activeIndex) {
      if (mode !== "showcase") return;
      const items = getItems();
      const count = items.length;
      if (!count) return;

      if (track.scrollLeft !== 0) track.scrollLeft = 0;
      activeIndex = ((index % count) + count) % count;
      const previousIndex = count > 2 ? (activeIndex - 1 + count) % count : -1;
      const nextIndex = count > 1 ? (activeIndex + 1) % count : -1;

      items.forEach((item, itemIndex) => {
        const isActive = itemIndex === activeIndex;
        const isPrevious = itemIndex === previousIndex;
        const isNext = itemIndex === nextIndex;
        item.classList.toggle("is-active", isActive);
        item.classList.toggle("is-prev", isPrevious);
        item.classList.toggle("is-next", isNext);
        item.classList.toggle("is-hidden", !isActive && !isPrevious && !isNext);
        item.setAttribute("aria-hidden", String(!isActive));
      });
      if (track.scrollLeft !== 0) track.scrollLeft = 0;
    }

    function setControlsState() {
      const disabled = getPages().length <= 1;
      carousel.classList.toggle("has-carousel-pages", !disabled);
      if (prev) prev.disabled = disabled;
      if (next) next.disabled = disabled;
    }

    function goToPage(index, behavior = "smooth") {
      const pages = getPages();
      if (pages.length <= 1) {
        setControlsState();
        return;
      }
      const normalizedIndex = (index + pages.length) % pages.length;
      if (mode === "showcase") {
        updateShowcase(normalizedIndex);
        setControlsState();
        return;
      }

      track.scrollTo({ left: pages[normalizedIndex], behavior });
      setControlsState();
    }

    function goBy(direction) {
      const pages = getPages();
      goToPage(currentPageIndex(pages) + direction);
    }

    function stopAuto() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function startAuto() {
      stopAuto();
      if (intervalMs <= 0 || reducedMotion.matches || getPages().length <= 1) return;
      timer = window.setInterval(() => {
        if (!paused && !document.hidden) goBy(1);
      }, intervalMs);
    }

    function resetAuto() {
      startAuto();
    }

    if (prev) {
      prev.addEventListener("click", () => {
        goBy(-1);
        resetAuto();
      });
    }

    if (next) {
      next.addEventListener("click", () => {
        goBy(1);
        resetAuto();
      });
    }

    carousel.addEventListener("pointerenter", () => {
      paused = true;
      stopAuto();
    });
    carousel.addEventListener("pointerleave", () => {
      paused = false;
      startAuto();
    });
    carousel.addEventListener("focusin", () => {
      paused = true;
      stopAuto();
    });
    carousel.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        if (!carousel.contains(document.activeElement)) {
          paused = false;
          startAuto();
        }
      });
    });

    if (mode !== "showcase") {
      track.addEventListener("scroll", setControlsState, { passive: true });
    }

    window.addEventListener("resize", () => {
      if (mode === "showcase") {
        scheduleShowcaseHeightMeasure();
        updateShowcase(activeIndex);
        resetAuto();
        return;
      }

      const index = currentPageIndex();
      goToPage(index, "auto");
      resetAuto();
    }, { passive: true });
    document.addEventListener("visibilitychange", resetAuto);
    reducedMotion.addEventListener?.("change", resetAuto);

    carousel.classList.add("is-paged");
    if (mode === "showcase") carousel.classList.add("is-showcase");
    carousel.dataset.carouselReady = "true";
    if (mode === "showcase") {
      measureShowcaseHeight();
      document.fonts?.ready.then(scheduleShowcaseHeightMeasure);
      getItems().forEach((item) => {
        item.querySelectorAll("img").forEach((image) => {
          if (!image.complete) image.addEventListener("load", scheduleShowcaseHeightMeasure, { once: true });
        });
      });
    }
    setControlsState();
    updateShowcase(0);
    startAuto();
  }

  initInstagramWidgets();
  document.querySelectorAll("[data-paged-carousel]").forEach(initPagedCarousel);

  if (hamburger && navMenu) {
    function closeMenu() {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
      if (nav) nav.classList.remove("menu-open");
      hamburger.setAttribute("aria-expanded", "false");
      body.classList.remove("overflow-hidden");
    }

    function openMenu() {
      hamburger.classList.add("active");
      navMenu.classList.add("active");
      if (nav) nav.classList.add("menu-open");
      hamburger.setAttribute("aria-expanded", "true");
      body.classList.add("overflow-hidden");
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

  function normalizePathname(pathname) {
    return String(pathname || "/").replace(/\/index\.html$/, "/").replace(/\/?$/, "/");
  }

  document.querySelectorAll('.site-logo[href^="/"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = new URL(link.getAttribute("href"), window.location.href);
      const currentPath = normalizePathname(window.location.pathname);
      const targetPath = normalizePathname(target.pathname);
      if (target.origin !== window.location.origin || targetPath !== currentPath) return;

      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const calculator = document.querySelector(".calculator-card");
  if (calculator) {
    const result = calculator.querySelector("[data-payment-result]");
    const amountInput = calculator.querySelector("[data-money-input]");
    const formatter = new Intl.NumberFormat(body.dataset.locale || "fr-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });
    const moneyInputFormatter = new Intl.NumberFormat("en-CA", {
      maximumFractionDigits: 0,
    });

    function parseMoneyInput(value) {
      return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
    }

    function formatMoneyInput(input) {
      if (!input) return;
      const amount = parseMoneyInput(input.value);
      input.value = amount ? `${moneyInputFormatter.format(amount)}$` : "";
    }

    function showRawMoneyInput(input) {
      if (!input) return;
      const amount = parseMoneyInput(input.value);
      input.value = amount ? String(amount) : "";
    }

    function parsePercentInput(value) {
      return Number(String(value || "").replace(",", ".").replace(/[^\d.]/g, "")) || 0;
    }

    function parseYearsInput(value) {
      return Number(String(value || "").replace(",", ".")) || 0;
    }

    function calculatePayment() {
      const amount = parseMoneyInput(calculator.elements.amount.value);
      const annualRate = parsePercentInput(calculator.elements.rate.value);
      const years = parseYearsInput(calculator.elements.years.value);
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

    if (amountInput) {
      formatMoneyInput(amountInput);
      amountInput.addEventListener("focus", () => showRawMoneyInput(amountInput));
      amountInput.addEventListener("blur", () => formatMoneyInput(amountInput));
    }
    calculator.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", calculatePayment);
    });
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
    modal.classList.remove("modal-error", "modal-phone", "modal-success");
    modal.classList.toggle("modal-phone", options.variant === "phone");
    modal.classList.add(success ? "modal-success" : "modal-error");
    modalIcon.textContent = "";
    if (options.variant === "phone") {
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "modal-phone-icon");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", MDI_PHONE_IN_TALK_OUTLINE_PATH);
      icon.appendChild(path);

      const number = document.createElement("span");
      number.textContent = options.title || "";
      modalIcon.append(icon, number);
    } else {
      modalIcon.textContent = options.title || getModalTitle(success);
    }
    modalMessage.textContent = message;
    modal.classList.remove("hidden");
    body.classList.add("overflow-hidden");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    body.classList.remove("overflow-hidden");
  }

  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  const sitePopup = document.getElementById("site-popup");
  const sitePopupClose = document.getElementById("site-popup-close");
  let sitePopupDismissed = false;

  function closeSitePopup() {
    if (!sitePopup) return;
    sitePopupDismissed = true;
    sitePopup.classList.add("hidden");
    body.classList.remove("overflow-hidden");
  }

  if (sitePopup) {
    window.setTimeout(() => {
      if (sitePopupDismissed) return;
      sitePopup.classList.remove("hidden");
      body.classList.add("overflow-hidden");
      if (sitePopupClose) sitePopupClose.focus({ preventScroll: true });
    }, 650);

    if (sitePopupClose) sitePopupClose.addEventListener("click", closeSitePopup);
    sitePopup.addEventListener("click", (event) => {
      if (event.target === sitePopup) closeSitePopup();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !sitePopup.classList.contains("hidden")) closeSitePopup();
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
        variant: "phone",
      });
    });
  });

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const submit = contactForm.querySelector('button[type="submit"]');
    const originalText = submit ? submit.textContent : "";
    const isEnglishForm = contactForm.dataset.locale === "en-CA";
    const messages = {
      sending: contactForm.dataset.sending || "Sending...",
      success: contactForm.dataset.success || "Message sent.",
      error: contactForm.dataset.error || "An error occurred.",
      network: contactForm.dataset.networkError || "Connection error.",
    };
    const validationMessages = isEnglishForm
      ? {
          name: "Enter your full name.",
          email: "Enter your email address.",
          emailInvalid: "Enter a valid email address.",
          phone: "Enter your phone number.",
          phoneInvalid: "Enter a valid phone number.",
          subject: "Select a subject.",
          message: "Write a short message.",
          turnstile: "Complete the verification before sending.",
        }
      : {
          name: "Entrez votre nom complet.",
          email: "Entrez votre courriel.",
          emailInvalid: "Entrez une adresse courriel valide.",
          phoneInvalid: "Entrez un numéro de téléphone valide.",
          phone: "Entrez votre numéro de téléphone.",
          subject: "Sélectionnez un sujet.",
          message: "Écrivez un court message.",
          turnstile: "Complétez la vérification avant d'envoyer.",
        };
    const validationFields = ["name", "email", "phone", "subject", "message"]
      .map((name) => contactForm.elements[name])
      .filter(Boolean);
    const phoneField = contactForm.elements.phone;
    let phoneInputController = null;
    let phoneInputReady = Promise.resolve();
    let phonePlusSyncTimer = 0;
    const formStatus = document.createElement("p");
    formStatus.className = "form-status";
    formStatus.setAttribute("role", "alert");
    formStatus.hidden = true;
    if (submit) submit.before(formStatus);

    function getFieldError(field) {
      const group = field.closest(".form-group");
      if (!group) return null;
      let error = group.querySelector(".form-error");
      if (!error) {
        error = document.createElement("span");
        error.className = "form-error";
        error.id = `${field.name}-error`;
        error.setAttribute("role", "alert");
        error.hidden = true;
        group.append(error);
      }
      return error;
    }

    function setFieldError(field, message) {
      const group = field.closest(".form-group");
      const error = getFieldError(field);
      if (!error) return;
      group.classList.add("has-error");
      field.setAttribute("aria-invalid", "true");
      const describedBy = field.getAttribute("aria-describedby") || "";
      if (!describedBy.split(/\s+/).includes(error.id)) {
        field.setAttribute("aria-describedby", `${describedBy} ${error.id}`.trim());
      }
      error.textContent = message;
      error.hidden = false;
    }

    function clearFieldError(field) {
      const group = field.closest(".form-group");
      const error = group ? group.querySelector(".form-error") : null;
      if (group) group.classList.remove("has-error");
      field.removeAttribute("aria-invalid");
      if (error) {
        const describedBy = (field.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter((id) => id && id !== error.id)
          .join(" ");
        if (describedBy) field.setAttribute("aria-describedby", describedBy);
        else field.removeAttribute("aria-describedby");
        error.textContent = "";
        error.hidden = true;
      }
    }

    function canUseInternationalPhoneInput() {
      return phoneInputController
        && typeof phoneInputController.isValidNumber === "function"
        && typeof phoneInputController.getNumber === "function";
    }

    function setupInternationalPhoneInput() {
      const intlTelInputFactory = window.intlTelInput || globalThis.intlTelInput;
      if (!phoneField || typeof intlTelInputFactory !== "function") {
        if (phoneField) console.warn("intl-tel-input did not load; using fallback phone validation.");
        return;
      }
      phoneInputController = intlTelInputFactory(phoneField, {
        initialCountry: "ca",
        countrySelectorMode: "DROPDOWN",
        separateDialCode: true,
        countrySearch: true,
        countryOrder: ["ca", "us", "fr", "gb", "be", "ch", "de", "es", "it", "pt", "mx", "br", "in", "cn", "jp", "kr", "ph", "vn", "au"],
        countryNameLocale: isEnglishForm ? "en" : "fr",
        placeholderNumberPolicy: "AGGRESSIVE",
        placeholderNumberType: "FIXED_LINE_OR_MOBILE",
        numberDisplayFormat: "NATIONAL",
      });
      phoneInputReady = phoneInputController.promise || Promise.resolve();
    }

    function formatPhoneField(field) {
      if (!field || !field.value.trim()) return;
      if (canUseInternationalPhoneInput()) {
        try {
          if (phoneInputController.isValidNumber()) {
            const formatted = phoneInputController.getNumber("NATIONAL");
            if (formatted) field.value = formatted;
          }
          return;
        } catch {
          return;
        }
      }
    }

    function syncPhoneCountryFromPlusNumber(field) {
      if (!field || !canUseInternationalPhoneInput()) return;
      const value = field.value.trim();
      if (!value.startsWith("+")) return;
      window.clearTimeout(phonePlusSyncTimer);
      phonePlusSyncTimer = window.setTimeout(() => {
        try {
          phoneInputController.setNumber(value);
        } catch {
          // Ignore partial international prefixes while the user is still typing.
        }
      }, 120);
    }

    function normalizedPhoneForSubmit(field) {
      if (!field || !field.value.trim()) return "";
      if (canUseInternationalPhoneInput()) {
        try {
          if (phoneInputController.isValidNumber()) return phoneInputController.getNumber("INTERNATIONAL");
        } catch {
          // Fall back to the visible value if the external utils script is unavailable.
        }
      }
      return field.value.trim();
    }

    function getFieldValidationMessage(field) {
      const value = field.value.trim();
      if (field.required && !value) return validationMessages[field.name] || messages.error;
      if (field.name === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return validationMessages.emailInvalid;
      }
      if (field.name === "phone" && value) {
        if (canUseInternationalPhoneInput()) {
          try {
            if (!phoneInputController.isValidNumber()) return validationMessages.phoneInvalid;
            return "";
          } catch {
            return validationMessages.phoneInvalid;
          }
        }
      }
      return "";
    }

    function validateField(field) {
      const message = getFieldValidationMessage(field);
      if (message) {
        setFieldError(field, message);
        return false;
      }
      clearFieldError(field);
      return true;
    }

    function setFormStatus(message) {
      formStatus.textContent = message || "";
      formStatus.hidden = !message;
    }

    function clearInlineErrors() {
      validationFields.forEach(clearFieldError);
      setFormStatus("");
    }

    function validateContactForm() {
      let firstInvalid = null;
      setFormStatus("");
      validationFields.forEach((field) => {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });
      return firstInvalid;
    }

    function getTurnstileToken() {
      const turnstileInput = contactForm.querySelector('input[name="cf-turnstile-response"]');
      if (turnstileInput && turnstileInput.value) return turnstileInput.value;
      if (window.turnstile && typeof window.turnstile.getResponse === "function") {
        return window.turnstile.getResponse() || "";
      }
      return "";
    }

    function focusInvalidControl(control) {
      control.focus({ preventScroll: true });
      control.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function handleSubmitError(message) {
      const lower = String(message || "").toLowerCase();
      let fieldName = "";
      if (lower.includes("name") || lower.includes("nom")) fieldName = "name";
      else if (lower.includes("email") || lower.includes("courriel")) fieldName = "email";
      else if (lower.includes("phone") || lower.includes("telephone") || lower.includes("téléphone")) fieldName = "phone";
      else if (lower.includes("subject") || lower.includes("sujet")) fieldName = "subject";
      else if (lower.includes("message")) fieldName = "message";

      if (fieldName && contactForm.elements[fieldName]) {
        setFieldError(contactForm.elements[fieldName], message);
        focusInvalidControl(contactForm.elements[fieldName]);
      } else {
        setFormStatus(message || messages.error);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    validationFields.forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, () => {
        setFormStatus("");
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    setupInternationalPhoneInput();
    if (phoneField) {
      phoneField.addEventListener("input", () => {
        syncPhoneCountryFromPlusNumber(phoneField);
      });
      phoneField.addEventListener("blur", () => {
        formatPhoneField(phoneField);
        if (phoneField.getAttribute("aria-invalid") === "true") validateField(phoneField);
      });
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await phoneInputReady.catch(() => null);
      formatPhoneField(phoneField);
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

      const firstInvalid = validateContactForm();
      if (firstInvalid) {
        focusInvalidControl(firstInvalid);
        return;
      }
      data.phone = normalizedPhoneForSubmit(phoneField);

      const token = getTurnstileToken();
      if (token) data.turnstileToken = token;
      else {
        setFormStatus(validationMessages.turnstile);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
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
          clearInlineErrors();
          if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
        } else {
          handleSubmitError(result.error || messages.error);
        }
      } catch {
        setFormStatus(messages.network);
        formStatus.scrollIntoView({ behavior: "smooth", block: "center" });
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText;
        }
      }
    });
  }

  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    revealElements.forEach((element) => element.classList.add("revealed"));
  } else if ("IntersectionObserver" in window && revealElements.length) {
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
