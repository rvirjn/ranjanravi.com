(() => {
  /** Local Docker: nginx (school_ui) proxies /api to the school_flask container. */
  const LOCAL_API_BASE = "/api";
  /** Production: Flask API hosted on Render. */
  const PRODUCTION_API_BASE = "https://schoolapi.ranjanravi.com/api";
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "10.0.2.2"];

  /** School name, logo text, website, etc. come from the logged-in user's school (session.school). */
  window.MPS_CONFIG = {
    API_BASE: LOCAL_HOSTS.includes(location.hostname) ? LOCAL_API_BASE : PRODUCTION_API_BASE,
    PRODUCT_NAME: "School Portal",
  };
})();
