/*!
 * WikiLambda Vue editor: Application store router
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

/**
 * @param {string} uriPath
 * @return {boolean}
 */
const isEvaluateFunctionCallPath = function ( uriPath ) {
	return uriPath === Constants.PATHS.EVALUTATE_FUNCTION_CALL;
};

/**
 * @param {string} uriPath
 * @return {boolean}
 */
const isNewOrExistingObjectPath = function ( uriPath ) {
	return [ Constants.PATHS.CREATE_Z_OBJECT, Constants.PATHS.EDIT_Z_OBJECT ].indexOf( uriPath ) !== -1;
};

/**
 * @param {Object} context The ZObject context in which we're operating
 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
 * @return {boolean}
 */
const isFunctionEditor = function ( context, uriQuery ) {
	return uriQuery.zid === Constants.Z_FUNCTION || context.rootGetters.getCurrentZObjectType === Constants.Z_FUNCTION;
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
	namespaced: true,
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
		 * @param {Object} context
		 * @param {Object} payload
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
		 * @param {Object} context
		 */
		evaluateView: function ( context ) {
			const uri = mw.Uri();
			if ( uri.query.view ) {
				context.commit( 'CHANGE_CURRENT_VIEW', uri.query.view );
				// we remove the view from the query params
				const params = $.extend( {}, uri.query );
				delete params.view;
				context.commit( 'CHANGE_QUERY_PARAMS', params );
			} else if ( isFunctionEditor( context, uri.query ) ) {
				context.dispatch( 'changeCurrentView', Constants.VIEWS.FUNCTION_EDITOR );
			} else if ( isEvaluateFunctionCallPath( uri.path ) || isNewOrExistingObjectPath( uri.path ) ) {
				context.dispatch( 'changeCurrentView', Constants.VIEWS.Z_OBJECT_EDITOR );
			} else {
				context.dispatch( 'changeCurrentView', Constants.VIEWS.Z_OBJECT_VIEWER );
			}
		},

		/**
		 * @param {Object} context
		 * @param {string} view
		 */
		changeCurrentView: function ( context, view ) {
			context.commit( 'CHANGE_CURRENT_VIEW', view );
			const uri = mw.Uri();
			const query = $.extend( uri.query, { view: view } );
			replaceToHistoryState( uri.path, query );
		}
	}
};
