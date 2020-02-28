const _ = require("lodash")
const TrelloApi = require('./TrelloApi')

class TrelloBoard extends TrelloApi {
  constructor(board = null) {
    super();
    this.board = board;
  }

  async load(id) {
    this.board = (await this.client().get(`/boards/${id}`)).data
    return this;
  }

  async members() {
    if (this._members) {
      return this._members;
    }

    this._members = (await this.client().get(`/boards/${this.board.id}/members`, { params: {  fields: 'all', }})).data

    return this._members
  }

  async membersAndCards() {
    const [{data: [{ '200': lists }, {'200': members }] }, cards] = await Promise.all([
      this.batch([
        {
          url: `/boards/${this.board.id}/lists`,
          params: {
            filters: 'all',
            fields: 'all',
          }
        },
        {
          url: `/boards/${this.board.id}/members`,
          params: {
            filters: 'all',
            fields: 'all',
          }
        }
      ]),
      this.cards()
    ])

    // console.log(lists)
    // const lists = Promise.all([
    //   await
    // const members = await this.members();
    // const cards = (await this.cards());
    const cardsWithList = cards.map(c => ({...c, list: lists.find(l => l.id === c.idList)}))
    const memberIds = _.uniq(_.flatMap(cards, c => c.idMembers))
    // console.log(cardsWithList[0])
    return memberIds.map(mId => {
      return {
        board: this.board,
        member: members.find(m => m.id === mId),
        cards: cardsWithList.filter(c => c.idMembers.includes(mId))
      }
    })
  }

  async cardsWithMembers() {
    const [{data: [{ '200': lists }, {'200': members }] }, cards] = await Promise.all([
      this.batch([
        {
          url: `/boards/${this.board.id}/lists`,
          params: {
            filters: 'all',
            fields: 'all',
          }
        },
        {
          url: `/boards/${this.board.id}/members`,
          params: {
            filters: 'all',
            fields: 'all',
          }
        }
      ]),
      this.cards()
    ])

    const cardsWithList = cards.map(c => ({...c, list: lists.find(l => l.id === c.idList)}))
    return cardsWithList.map(card => {
      return {
        board: this.board,
        members: members.filter(m => card.idMembers.includes(m.id)),
        card: card
      }
    }).filter(c => !!c.members.length)
  }

  async cards() {
    if (this._cards) {
      return this._cards;
    }

    this._cards = await this._getAllCards()

    return this._cards
  }


  async lists() {
    if (this._lists) {
      return this._lists;
    }
    const res = await this.client().get(`/boards/${this.board.id}/lists`, {
      params: {
        filters: 'all',
        fields: 'all',
      }
    });
    this._lists = res.data
    return this._lists
  }

  async  _getAllCards() {
    let allCards = [];
    let before = null;
    for (; true; ) {
      const cards = await this._getCards(this.board.id, { limit: 1000, before: before });
      allCards = [...allCards, ...cards]
      const lastCard = cards && cards.length ? cards[cards.length - 1] : null;
      if (lastCard) {
        before = lastCard.id
      } else {
        break;
      }
    }
  
    return allCards;
  }

  async _getCards(boardId, options = {}) {
    const res = await this.client().get(`/boards/${boardId}/cards`, {
      params: {
        filters: 'all',
        fields: 'all',
        sort: '-id',
        ...options
      }
    });
    return res.data;
  }
}

module.exports = TrelloBoard