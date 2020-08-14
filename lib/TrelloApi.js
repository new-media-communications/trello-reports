const Axios = require("axios");
const _ = require("lodash");
const querystring = require("querystring");
const config = require("./config");

class TrelloApi {
  constructor() {
    /**
     * @type {Axios.AxiosInstance}
     */
    this._api = Axios.create({
      baseURL: config.get("trello.api_url"),
    });

    this.key = config.get("trello.key");
    this.token = config.get("trello.token");

    this._api.interceptors.request.use((config) => {
      config.params = {
        key: this.key,
        token: this.token,
        ...(config.params || {}),
      };
      return config;
    });
  }

  withToken(token) {
    this.token = token;
    return this;
  }

  withKey(key) {
    this.key = key;
    return this;
  }

  client() {
    return this._api;
  }

  batch(urls = []) {
    const urlsStrings = urls.map((url) => {
      return `${url.url}?${querystring.encode(url.params)}`;
    });
    return this.client().get("/batch", {
      params: {
        urls: urlsStrings.join(","),
      },
    });
  }

  /**
   * @return {any[]}
   */
  async myBoards() {
    const { data: allBoards } = await this.client().get("/members/me/boards", {
      params: { fields: "all" },
    });

    return allBoards;
  }
}

module.exports = TrelloApi;
