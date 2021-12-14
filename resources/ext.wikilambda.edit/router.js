var VueRouter = require( '../lib/vue-router/vue-router.common.js' ),
	FunctionEditor = require( './views/FunctionEditor.vue' ),
	FunctionDefinition = require( './views/FunctionDefinition.vue' ),
	FunctionImplementations = require( './views/FunctionImplementations.vue' ),
	FunctionTests = require( './views/FunctionTests.vue' ),
	FunctionView = require( './views/FunctionView.vue' ),
	ZObjectViewer = require( './components/ZObjectViewer.vue' ),
	ZObjectEditor = require( './components/ZObjectEditor.vue' ),
	Constants = require( './Constants.js' ),
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

// TODO: This is a temporary hack required to develop a new editor while still havve access to the old one
// This will be removed as soon as the editor is completed (T297123)
var EditorWrapper = {
	functional: true,
	props: [ 'zid', 'type' ],
	render: function ( h, ctx ) {
		var isNewDesign = ctx.props.type === 'newDesign';
		var isFunctionEditor = ctx.props.zid === Constants.Z_FUNCTION ||
		store.getters.getCurrentZObjectType === Constants.Z_FUNCTION;
		var component = ZObjectEditor;

		if ( isNewDesign ) {
			component = FunctionView;
		} else if ( isFunctionEditor ) {
			component = FunctionEditor;
		}

		return h( component, ctx.data, ctx.children );
	}
};

var routes = [
	{
		path: '/wiki/Special\\:CreateZObject',
		name: 'create',
		props: function ( route ) {
			return ( {
				zid: route.query.zid,
				type: route.query.type
			} );
		},
		component: EditorWrapper,
		children: [
			{
				name: 'functionDefinition',
				path: 'functionDefinition',
				component: FunctionDefinition
			},
			{
				name: 'functionImplementation',
				path: 'functionImplementation',
				component: FunctionImplementations
			},
			{
				name: 'functionTests',
				path: 'functionTests',
				component: FunctionTests
			}
		]
	},
	{
		path: '/wiki/Special\\:CreateZObject/(ciao)',
		name: 'create',
		props: function ( route ) {
			return ( { zid: route.query.zid } );
		},
		component: FunctionDefinition
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
