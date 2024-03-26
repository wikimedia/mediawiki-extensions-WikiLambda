/*!
 * WikiLambda Vue editor: Application store router
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

/**
 * Whether the URL is to Special Evaluate Function Call page
 *
 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
 * @return {boolean}
 */
const isEvaluateFunctionCallPath = function ( uriQuery ) {
	return ( uriQuery.title === Constants.PATHS.RUN_FUNCTION_TITLE );
};

/**
 * Whether the current config has viewmode=true
 *
 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
 * @return {boolean}
 */
const isViewMode = function () {
	const editingData = mw.config.get( 'wgWikiLambda' );
	return editingData.viewmode;
};

/**
 * Whether the URL is to Special Create ZObject page
 *
 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
 * @return {boolean}
 */
const isCreatePath = function ( uriQuery ) {
	return ( uriQuery.title === Constants.PATHS.CREATE_OBJECT_TITLE );
};

/**
 * Whether the Root ZObject presented in the view or edit page is a Z8/Function
 *
 * @param {Object} context The ZObject context in which we're operating
 * @return {boolean}
 */
const isFunctionRootObject = function ( context ) {
	return context.rootGetters.getCurrentZObjectType === Constants.Z_FUNCTION;
};

/**
 * Whether the given URI path string is a known view in Constants.VIEWS
 *
 * @param {string} view
 * @return {boolean}
 */
const viewIsInvalid = function ( view ) {
	let viewExist = false;
	Object.keys( Constants.VIEWS ).forEach( function ( viewKey ) {
		if ( Constants.VIEWS[ viewKey ] === view ) {
			viewExist = true;
		}
	} );
	return !viewExist;
};

/**
 * @param {string} path
 * @param {string} query
 */
const pushToHistoryState = function ( path, query ) {
	const stateObj = {
		path: path,
		query: query
	};
	const queryString = path + '?' + $.param( query );
	window.history.pushState( stateObj, null, queryString );
};

/**
 * @param {string} path
 * @param {string} query
 */
const replaceToHistoryState = function ( path, query ) {
	const stateObj = {
		path: path,
		query: query
	};
	const queryString = path + '?' + $.param( query );
	window.history.replaceState( stateObj, null, queryString );
};

module.exports = {
	state: {
		currentPath: mw.Uri().path,
		currentView: Constants.VIEWS.Z_OBJECT_VIEWER,
		queryParams: mw.Uri().query
	},
	getters: {
		getCurrentView: function ( state ) {
			return state.currentView;
		},
		getQueryParams: function ( state ) {
			return state.queryParams;
		}
	},
	mutations: {
		CHANGE_CURRENT_VIEW: function ( state, view ) {
			state.currentView = view;
		},
		CHANGE_QUERY_PARAMS: function ( state, queryParams ) {
			state.queryParams = queryParams;
		}
	},
	actions: {
		/**
		 * Changes the current View and Query params and updates the history states.
		 * This method is used to navigate between pages within the UI.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.to
		 * @param {Object} payload.params
		 */
		navigate: function ( context, payload ) {
			if ( viewIsInvalid( payload.to ) ) {
				return;
			}

			context.commit( 'CHANGE_CURRENT_VIEW', payload.to );
			if ( payload.params ) {
				const queryParamsObject = $.extend( {}, context.state.queryParams, payload.params );
				context.commit( 'CHANGE_QUERY_PARAMS', queryParamsObject );
			}
			const query = $.extend( {}, context.state.queryParams, { view: context.state.currentView } );
			pushToHistoryState( context.state.currentPath, query );
		},
		/**
		 * Evaluate the Uri path to evaluate what View should be displayed.
		 *
		 * @param {Object} context
		 */
		evaluateUri: function ( context ) {
			const uri = mw.Uri();

			// Set title of mw query if url is in /wiki/{{ title }} format
			if ( !uri.query.title && uri.path.includes( '/wiki' ) ) {
				const lastPathIndex = uri.path.lastIndexOf( '/' );
				uri.query.title = uri.path.slice( lastPathIndex + 1 );
			}

			let currentView;

			// 1. if Special page Create
			if ( isCreatePath( uri.query ) ) {
				// I we have zid=Z8 in the uri, render function edit view
				// Else, render default view
				currentView = ( uri.query.zid === Constants.Z_FUNCTION ) ?
					Constants.VIEWS.FUNCTION_EDITOR :
					Constants.VIEWS.DEFAULT_VIEW;

				// Change view and end?
				context.dispatch( 'changeCurrentView', currentView );
				return;
			}

			// 2. if Special page Run Function
			if ( isEvaluateFunctionCallPath( uri.query ) ) {
				currentView = Constants.VIEWS.FUNCTION_EVALUATOR;
				context.dispatch( 'changeCurrentView', currentView );
				return;
			}

			if ( isFunctionRootObject( context ) ) {
				currentView = isViewMode() ?
					Constants.VIEWS.FUNCTION_VIEWER :
					Constants.VIEWS.FUNCTION_EDITOR;

				// Change view and end?
				context.dispatch( 'changeCurrentView', currentView );
				return;
			}

			currentView = Constants.VIEWS.DEFAULT_VIEW;
			context.dispatch( 'changeCurrentView', currentView );
		},
		/**
		 * Handle the changes of a view and replace the history state.
		 * This method is usually used when the change of view is made dynamically.
		 *
		 * @param {Object} context
		 * @param {string} view
		 */
		changeCurrentView: function ( context, view ) {
			context.commit( 'CHANGE_CURRENT_VIEW', view );
			const uri = mw.Uri();
			// should only replace history state if path query view is set and is different from new view
			if ( uri.query.view && uri.query.view !== view ) {
				const query = $.extend( uri.query, { view: view } );
				replaceToHistoryState( uri.path, query );
			}
		}
	}
};
