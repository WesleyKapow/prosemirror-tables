export class TableView {
  constructor(node, cellMinWidth) {
    this.node = node
    this.cellMinWidth = cellMinWidth
    this.dom = document.createElement("div")
    this.dom.className = "table-outer"
    this.wrapper = this.dom.appendChild(document.createElement("div"))
    this.wrapper.className = "table-wrapper"
    this.table = this.wrapper.appendChild(document.createElement("table"))
    this.colgroup = this.table.appendChild(document.createElement("colgroup"))
    updateColumns(node, this.colgroup, this.table, cellMinWidth)
    this.contentDOM = this.table.appendChild(document.createElement("tbody"))
  }

  update(node) {
    if (node.type != this.node.type) return false
    this.node = node
    updateColumns(node, this.colgroup, this.table, this.cellMinWidth)
    return true
  }

  ignoreMutation(record) {
    return record.type == "attributes" && (record.target == this.dom || record.target == this.wrapper || record.target == this.table || this.colgroup.contains(record.target))
  }
}

export function updateColumns(node, colgroup, table, cellMinWidth, overrideCol, overrideValue) {
  let totalWidth = 0, fixedWidth = true
  let nextDOM = colgroup.firstChild, row = node.firstChild
  for (let i = 0, col = 0; i < row.childCount; i++) {
    let {colspan, colwidth} = row.child(i).attrs
    for (let j = 0; j < colspan; j++, col++) {
      let hasWidth = overrideCol == col ? overrideValue : colwidth && colwidth[j]
      let cssWidth = hasWidth ? hasWidth + "px" : ""
      totalWidth += hasWidth || cellMinWidth
      if (!hasWidth) fixedWidth = false
      if (!nextDOM) {
        colgroup.appendChild(document.createElement("col")).style.width = cssWidth
      } else {
        if (nextDOM.style.width != cssWidth) nextDOM.style.width = cssWidth
        nextDOM = nextDOM.nextSibling
      }
    }
  }

  while (nextDOM) {
    let after = nextDOM.nextSibling
    nextDOM.parentNode.removeChild(nextDOM)
    nextDOM = after
  }

  if (fixedWidth) {
    table.parentNode.style.width = totalWidth + 1 + "px" // 1 extra to fix non-needed scrollbar bug
    table.style.minWidth = ""
    node.attrs.width = totalWidth + 1
    node.attrs.minWidth = null
  } else {
    node.attrs.width = null
    table.parentNode.style.width = ""
    node.attrs.minWidth = totalWidth + 1
    table.style.minWidth = totalWidth + 1 + "px" // 1 extra to fix non-needed scrollbar bug
  }
}
