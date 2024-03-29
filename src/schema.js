// Helper for creating a schema that supports tables.

function getCellAttrs(dom, extraAttrs) {
  let widthAttr = dom.getAttribute("data-colwidth")
  let widths = widthAttr && /^\d+(,\d+)*$/.test(widthAttr) ? widthAttr.split(",").map(s => Number(s)) : null
  let colspan = Number(dom.getAttribute("colspan") || 1)
  let result = {
    colspan,
    rowspan: Number(dom.getAttribute("rowspan") || 1),
    colwidth: widths && widths.length == colspan ? widths : null
  }
  for (let prop in extraAttrs) {
    let getter = extraAttrs[prop].getFromDOM
    let value = getter && getter(dom)
    if (value != null) result[prop] = value
  }
  return result
}

function setCellAttrs(node, extraAttrs) {
  let attrs = {}
  if (node.attrs.colspan != 1) attrs.colspan = node.attrs.colspan
  if (node.attrs.rowspan != 1) attrs.rowspan = node.attrs.rowspan
  if (node.attrs.colwidth) {
    attrs["data-colwidth"] = node.attrs.colwidth.join(",")
    attrs["style"] = `width: ${node.attrs.colwidth[0]}px;`
  }
  for (let prop in extraAttrs) {
    let setter = extraAttrs[prop].setDOMAttr
    if (setter) setter(node.attrs[prop], attrs)
  }
  return attrs
}

// :: (Object) → Object
//
// This function creates a set of [node
// specs](http://prosemirror.net/docs/ref/#model.SchemaSpec.nodes) for
// `table`, `table_row`, and `table_cell` nodes types as used by this
// module. The result can then be added to the set of nodes when
// creating a a schema.
//
//   options::- The following options are understood:
//
//     tableGroup:: ?string
//     A group name (something like `"block"`) to add to the table
//     node type.
//
//     cellContent:: string
//     The content expression for table cells.
//
//     cellAttributes:: ?Object
//     Additional attributes to add to cells. Maps attribute names to
//     objects with the following properties:
//
//       default:: any
//       The attribute's default value.
//
//       getFromDOM:: ?(dom.Node) → any
//       A function to read the attribute's value from a DOM node.
//
//       setDOMAttr:: ?(value: any, attrs: Object)
//       A function to add the attribute's value to an attribute
//       object that's used to render the cell's DOM.
export function tableNodes(options) {
  let extraAttrs = options.cellAttributes || {}
  let cellAttrs = {
    colspan: {default: 1},
    rowspan: {default: 1},
    colwidth: {default: null}
  }
  for (let prop in extraAttrs)
    cellAttrs[prop] = {default: extraAttrs[prop].default}

  return {
    table: {
      content: "table_row+",
      draggable: true,
      draggingIcon: "icon-table",
      tableRole: "table",
      isolating: true,
      group: options.tableGroup,
      parseDOM: [{tag: "div[class='table-outer']"}],
      toDOM(node) {
        // Copied from tableview in order to calculate our width and if we
        // are fixed or not.
        let totalWidth = 0, fixedWidth = true
        const row = node.child(0)
        for (let i = 0, col = 0; i < row.childCount; i++) {
          let {colspan, colwidth} = row.child(i).attrs
          for (let j = 0; j < colspan; j++, col++) {
            let hasWidth = colwidth && colwidth[j]
            totalWidth += hasWidth || options.cellMinWidth
            if (!hasWidth) fixedWidth = false
          }
        }

        // Replicate what our tableView does with either setting:
        // * min-width on the table -- helps expand table (scroll)
        // * width on the table-outer -- helps shrink table (< 100% width)
        const tableStyle = !fixedWidth ? {style: `min-width: ${totalWidth + 1}px`} : {}
        const tableOuterStyle = fixedWidth ? {style: `width: ${totalWidth + 1}px`} : {}

        // Create our table-outer -> table-wrapper -> table DOM.
        const table = ["table", tableStyle, ["tbody", 0]]
        const tableWrapper = ["div", {class: 'table-wrapper'}, table]
        return ["div", Object.assign({class: 'table-outer'}, tableOuterStyle), tableWrapper]
      }
    },
    table_row: {
      content: "(table_cell | table_header)*",
      tableRole: "row",
      isolating: true, // XXX is this needed? https://github.com/wes-r/prosemirror-tables/commit/6808a96a377924d3a71e4f7f643fd615ab672539
      parseDOM: [{tag: "tr"}],
      toDOM() { return ["tr", 0] }
    },
    table_cell: {
      content: options.cellContent,
      attrs: cellAttrs,
      tableRole: "cell",
      isolating: true,
      parseDOM: [{tag: "td", getAttrs: dom => getCellAttrs(dom, extraAttrs)}],
      toDOM(node) { return ["td", setCellAttrs(node, extraAttrs), 0] }
    },
    table_header: {
      content: options.cellContent,
      attrs: cellAttrs,
      tableRole: "header_cell",
      isolating: true,
      parseDOM: [{tag: "th", getAttrs: dom => getCellAttrs(dom, extraAttrs)}],
      toDOM(node) { return ["th", setCellAttrs(node, extraAttrs), 0] }
    }
  }
}

export function tableNodeTypes(schema) {
  let result = schema.cached.tableNodeTypes
  if (!result) {
    result = schema.cached.tableNodeTypes = {}
    for (let name in schema.nodes) {
      let type = schema.nodes[name], role = type.spec.tableRole
      if (role) result[role] = type
    }
  }
  return result
}
