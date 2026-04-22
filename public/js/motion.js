/**
 * Vision360 Motion System
 * Handles IntersectionObserver for entry animations and scroll-based navbar states.
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollTracker();
    initIntersectionObserver();
});

function initScrollTracker() {
    const header = document.querySelector(".header");
    if (!header) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
}

function initIntersectionObserver() {
    const options = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in-view");
                // Stop observing once visible to ensure single entry
                observer.unobserve(entry.target);
            }
        });
    }, options);

    // Observe sections and key elements
    const targets = document.querySelectorAll(".motion-fade-up, .campus-card");
    targets.forEach(el => observer.observe(el));
}
