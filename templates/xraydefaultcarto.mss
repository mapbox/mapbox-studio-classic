Map {
  background-color: #fff;
}
<% _(obj).each(function(layer) { %>
#<%=layer.id%> {
  line-width: 1;
  line-color: <%= this.xraycolor(layer.id).replace('\n','') %>;
}
<% }.bind(this)); %>
