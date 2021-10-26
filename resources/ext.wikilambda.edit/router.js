var VueRouter = require( '../lib/vue-router/vue-router.common.js' ),
	FunctionEditor = require( './views/FunctionEditor.vue' ),
	ZObjectViewer = require( './components/ZObjectViewer.vue' ),
	ZObjectEditor = require( './components/ZObjectEditor.vue' ),
	store = require( './store/index.js' ),
	getParameterByName = require( './mixins/urlUtils.js' ).methods.getParameterByName;

// Vue Router relies on process.env.NODE_ENV being present.
// This code is a bit of a hack to make sure that it is present.
// If ?debug=true is passed in the URL, it will set process.env.NODE_ENV to 'development'.
// Otherwise, it will set it to 'production'.
var isDebugMode = getParameterByName( 'debug' ) === 'true';

window.process = {
	env: {
		NODE_ENV: isDebugMode ? 'development' : 'production'
	}
};

var EditorWrapper = {
	functional: true,
	props: [ 'zid' ],
	render: function ( h, ctx ) {
		var component = ctx.props.zid === 'Z8' || store.getters.getCurrentZObjectType === 'Z8' ? FunctionEditor : ZObjectEditor;
		return h( component, ctx.data, ctx.children );
	}
};

var routes = [
	{
		path: '/wiki/Special\\:CreateZObject',
		name: 'create',
		props: function ( route ) {
			return ( { zid: route.query.zid } );
		},
		component: EditorWrapper
	},
	{
		path: '/wiki/:id(Z[1-9]\\d*)',
		name: 'view',
		component: ZObjectViewer
	},
	{
		path: '/wiki/Special\\:EvaluateFunctionCall',
		name: 'functionCall',
		component: ZObjectEditor
	},
	{
		path: '/w/index.php',
		name: 'edit',
		props: function ( route ) {
			return ( { zid: route.query.zid } );
		},
		component: EditorWrapper
	}
];

module.exports = new VueRouter(
	{
		routes: routes,
		mode: 'history'
	}
);
