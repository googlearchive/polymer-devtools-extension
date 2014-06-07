function getDOMString() {
  var serializer = new XMLSerializer();
  return {
    "data": serializer.serializeToString(document)
  }
}
