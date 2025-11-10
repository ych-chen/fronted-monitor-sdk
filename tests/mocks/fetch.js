async function fetch(url, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map(),
        json: async () => ({}),
        text: async () => '',
        blob: async () => new Blob(),
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    }, 20);
  });
}

module.exports = { fetch };