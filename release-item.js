class ReleaseItem {
  constructor(props) {
    if (!(typeof props === "object" && props !== null)) {
      props = this.parse(props);
    }
    this.type = props.type;
    this.title = props.title;
    this.id = props.id;
    this.team = props.id.match(/\w+/g)[0];
    this.number = props.id.match(/\d+/g)[0];
  }

  parse(text) {
    return {
      id: text.match(/\w+-\d+/g)[0],
      type: text.match(/\[(\w+)\]/)[1],
      title: text.match(/\]\s(.+)/)[1],
    };
  }

  compare(item) {
    if (this.team > item.team) {
      return 1;
    } else if (this.team < item.team) {
      return -1;
    } else {
      return this.number - item.number;
    }
  }

  asMarkup() {}
}

module.exports = ReleaseItem;
