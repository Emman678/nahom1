/* ==========================================================================
   NAHOM — site configuration
   Edit this file to switch on contact methods, the showreel and the form.
   Anything left as "" is hidden on the live site. Nothing is guessed.
   ========================================================================== */
window.NAHOM_SITE = {
  name: "Nahom",
  role: "Video Editor & Creative Strategist",

  contact: {
    /* Plain address, e.g. "name@example.com". Enables "Send by email" + footer link. */
    email: "",
    /* Full https:// profile URLs (Upwork, Instagram, TikTok, LinkedIn). */
    upwork: "",
    instagram: "",
    tiktok: "",
    linkedin: "",
    /* WhatsApp: digits with country code (e.g. "251911000000") or a full https://wa.me/... link. */
    whatsapp: "",
    /* Optional: a form service URL (Formspree, Getform, Basin, your own API).
       The form POSTs JSON here and only says "sent" when the server replies OK. */
    formEndpoint: ""
  },

  /* Subject line used for mailto and for the form message. */
  mailSubject: "Video editing project inquiry",

  /* Optional hero footage: a short, muted, looping clip that plays inside the portrait frame.
     Leave empty to keep the still portrait. The portrait stays as the poster and as the
     fallback for people who prefer reduced motion. Never plays sound. */
  hero: {
    videoUrl: ""    /* e.g. "assets/videos/hero-loop.mp4" */
  },

  /* Showreel: leave videoUrl empty to show the quiet "coming soon" panel.
     videoUrl can be a local file (assets/videos/showreel.mp4), a YouTube link or a Vimeo link. */
  showreel: {
    videoUrl: "",
    poster: "",     /* e.g. "assets/images/showreel-poster.jpg" */
    captions: ""    /* optional .vtt file for local videos */
  }
};
