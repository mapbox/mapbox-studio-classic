Map {
  background-color: #fff;
}
<% _(obj).each(_(function(layer) { %>
#<%=layer.id%> {<% if (layer.id === 'raster_local') {%>
  raster-opacity: 1;<% } else { %>
  line-width: 1;
  line-color: <%= this.xraycolor(layer.id).replace('\n','') %>;<% } %>
}
<% }).bind(this)); %>
