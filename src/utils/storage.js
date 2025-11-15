const storage = {
  async get(key, shared = false) {
    try {
      const value = localStorage.getItem(key);
      return value ? { key, value, shared } : null;
    } catch (error) {
      console.error("Storage get error:", error);
      throw error;
    }
  },

  async set(key, value, shared = false) {
    try {
      localStorage.setItem(key, value);
      return { key, value, shared };
    } catch (error) {
      console.error("Storage set error:", error);
      return null;
    }
  },

  async delete(key, shared = false) {
    try {
      localStorage.removeItem(key);
      return { key, deleted: true, shared };
    } catch (error) {
      console.error("Storage delete error:", error);
      return null;
    }
  },

  async list(prefix = "", shared = false) {
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(prefix)
      );
      return { keys, prefix, shared };
    } catch (error) {
      console.error("Storage list error:", error);
      return null;
    }
  },
};

if (typeof window !== "undefined") {
  window.storage = storage;
}

export default storage;
