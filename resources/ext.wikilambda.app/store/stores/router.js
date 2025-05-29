/*!
 * WikiLambda Vue editor: Application store router (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const urlUtils = require( '../../utils/urlUtils.js' );

module.exports = {
	state: {
		currentPath: window.location.pathname,
		currentView: Constants.VIEWS.Z_OBJECT_VIEWER,
		queryParams: urlUtils.getQueryParamsFromUrl( window.location.href )
	},

	getters: {
		getWikilambdaConfig: function () {
			return mw.config.get( 'wgWikiLambda' ) || {};
		},
		/**
		 * Returns current loaded view if wikilambda Repo mode.
		 * Else returns undefined.
		 *
		 * @param {Object} state
		 * @return {string|undefined}
		 */
		getCurrentView: function ( state ) {
			return state.currentView;
		},
		/**
		 * Returns Uri query parameters
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getQueryParams: function ( state ) {
			return state.queryParams;
		},
		/**
		 * Returns view mode flag if wikilambda Repo mode.
		 * Else returns undefined.
		 *
		 * @param {Object} state
		 * @return {boolean|undefined}
		 */
		getViewMode: function () {
			return this.getWikilambdaConfig.viewmode;
		}
	},

	actions: {
		/**
		 * Changes the current View and Query params and updates the history state.
		 *
		 * @param {Object} payload
		 * @param {string} payload.to - Target view.
		 * @param {Object} [payload.params] - Additional query parameters.
		 */
		navigate: function ( { to, params } ) {
			if ( !this.isValidView( to ) ) {
				return;
			}

			this.currentView = to;

			const url = new URL( window.location.href );

			if ( params ) {
				this.queryParams = Object.assign( {}, this.queryParams, params );
			}
			const newQuery = Object.assign( {}, this.queryParams, { view: this.currentView } );

			url.pathname = this.currentPath;
			for ( const key in newQuery ) {
				url.searchParams.set( key, newQuery[ key ] );
			}
			const query = urlUtils.searchParamsToObject( url.searchParams );
			window.history.pushState( { path: url.pathname, query }, null, url.toString() );
		},

		/**
		 * Evaluate the Uri path and determine what View should be displayed.
		 */
		evaluateUri: function () {
			const url = new URL( window.location.href );
			const params = url.searchParams;
			const path = url.pathname;

			// Set title if URL is in `/wiki/{{ title }}` format
			let title = params.get( 'title' );
			if ( !title && path.includes( '/wiki' ) ) {
				title = path.slice( path.lastIndexOf( '/' ) + 1 );
			}

			// 1. if Special page Create
			if ( this.isCreatePath( title ) ) {
				const zid = params.get( 'zid' );
				this.changeCurrentView(
					zid && zid.toUpperCase() === Constants.Z_FUNCTION ?
						Constants.VIEWS.FUNCTION_EDITOR :
						Constants.VIEWS.DEFAULT
				);
				return;
			}

			// 2. if Special page Run Function
			if ( this.isEvaluateFunctionCallPath( title ) ) {
				this.changeCurrentView( Constants.VIEWS.FUNCTION_EVALUATOR );
				return;
			}

			// 3. if Function page (edit or view)
			if ( this.isFunctionRootObject() ) {
				this.changeCurrentView(
					this.getViewMode ?
						Constants.VIEWS.FUNCTION_VIEWER :
						Constants.VIEWS.FUNCTION_EDITOR
				);
				return;
			}

			// 4. Default view
			this.changeCurrentView( Constants.VIEWS.DEFAULT );
		},

		/**
		 * Handle the changes of a view and replace the history state.
		 *
		 * @param {string} newView - The new view to set.
		 */
		changeCurrentView: function ( newView ) {
			this.currentView = newView;

			const url = new URL( window.location.href );
			const path = url.pathname;
			const params = url.searchParams;
			const currentView = params.get( 'view' );

			// should only replace history state if path query view is set and is different from new view
			if ( currentView && currentView !== newView ) {
				params.set( 'view', newView );
				const query = urlUtils.searchParamsToObject( params );
				window.history.replaceState( { path, query }, null, url.toString() );
			}
		},

		/**
		 * Check if  the given url path 'view' string is a known view in Constants.VIEWS
		 *
		 * @param {string} view
		 * @return {boolean}
		 */
		isValidView: function ( view ) {
			for ( const key in Constants.VIEWS ) {
				if ( Constants.VIEWS[ key ] === view ) {
					return true;
				}
			}
			return false;
		},

		/**
		 * Check if the path is for Special:CreateZObject
		 *
		 * @param {string} title
		 * @return {boolean}
		 */
		isCreatePath: function ( title ) {
			return title === Constants.PATHS.CREATE_OBJECT_TITLE;
		},

		/**
		 * Check if the path is for Special:EvaluateFunctionCall
		 *
		 * @param {string} title
		 * @return {boolean}
		 */
		isEvaluateFunctionCallPath: function ( title ) {
			return title === Constants.PATHS.RUN_FUNCTION_TITLE;
		},

		/**
		 * Check if the current ZObject is a Z8/Function
		 *
		 * @param {string} title
		 * @return {boolean}
		 */
		isFunctionRootObject: function () {
			return this.getCurrentZObjectType === Constants.Z_FUNCTION;
		}
	}
};
