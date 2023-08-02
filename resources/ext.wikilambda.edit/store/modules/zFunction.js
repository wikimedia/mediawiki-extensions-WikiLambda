/*!
 * WikiLambda Vue editor: Function Editor Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' );

module.exports = exports = {
	getters: {
		/**
		 * Returns a list of all the language Zids that are present
		 * in the function metadata collection (must have at least
		 * a name, a description or a set of aliases or input labels).
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionLanguages: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			function findAllLanguages( rowId = 0 ) {
				// Get languages available in name, description and alias fields
				const nameLangs = getters.getZPersistentNameLangs( rowId );
				const descriptionLangs = getters.getZPersistentDescriptionLangs( rowId );
				const aliasLangs = getters.getZPersistentAliasLangs( rowId );
				// Get languages available in input labels
				const inputLangs = getters.getZFunctionInputLangs( rowId );
				// Combine all languages and return the array of unique languageZids
				const allLangs = nameLangs.concat( descriptionLangs, aliasLangs, inputLangs );
				const langZids = allLangs.map( ( lang ) => lang.langZid );
				return [ ...new Set( langZids ) ];
			}

			return findAllLanguages;
		},
		/**
		 * Returns the function Zid of a given function given
		 * the function rowId. If not set, returns undefined
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionIdentity: function ( _state, getters ) {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			function findIdentity( rowId = 0 ) {
				const functionZid = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_IDENTITY
				], rowId );
				return functionZid ?
					getters.getZReferenceTerminalValue( functionZid.id ) :
					undefined;
			}
			return findIdentity;
		},
		/**
		 * Returns the list of input rows for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionInputs: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			function findZFunctionInputs( rowId = 0 ) {
				const inputsRow = getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_ARGUMENTS
				], rowId );
				if ( inputsRow === undefined ) {
					return [];
				}
				const inputs = getters.getChildrenByParentRowId( inputsRow.id );
				// Remove benjamin type item
				return inputs.slice( 1 );
			}
			return findZFunctionInputs;
		},
		/**
		 * Returns the array of language Zids that are present
		 * in a function's input labels. If no arguments or no
		 * labels, returns an empty array.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionInputLangs: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			function findInputLangs( rowId = 0 ) {
				let languages = [];
				const inputs = getters.getZFunctionInputs( rowId );
				for ( const inputRow of inputs ) {
					const inputLabelsRow = getters.getRowByKeyPath( [
						Constants.Z_ARGUMENT_LABEL,
						Constants.Z_MULTILINGUALSTRING_VALUE
					], inputRow.id );
					const inputLangs = inputLabelsRow ?
						getters.getZMultilingualLanguageList( inputLabelsRow.id ) :
						[];
					languages = languages.concat( inputLangs );
				}
				return languages;
			}

			return findInputLangs;
		},
		/**
		 * Returns the output type row for the function given
		 * given the root object rowId. If no rowId given, starts
		 * from 0, which is safe to use.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZFunctionOutput: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {Object|undefined}
			 */
			function findZFunctionOutput( rowId = 0 ) {
				return getters.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_VALUE,
					Constants.Z_FUNCTION_RETURN_TYPE
				], rowId );
			}
			return findZFunctionOutput;
		},
		/**
		 * Returns the input type row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZArgumentTypeRowId: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @return {number|undefined}
			 */
			function findArgumentType( rowId ) {
				const argType = getters.getRowByKeyPath( [ Constants.Z_ARGUMENT_TYPE ], rowId );
				return argType ? argType.id : undefined;
			}
			return findArgumentType;
		},
		/**
		 * Returns the input label row of an input or
		 * argument declaration, given the rowId of the
		 * argument/Z17 object and the language Zid.
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getZArgumentLabelForLanguage: function ( _state, getters ) {
			/**
			 * @param {string} rowId
			 * @param {string} lang
			 * @return {Object|undefined}
			 */
			function findArgumentLabel( rowId, lang ) {
				const argLabelsRow = getters.getRowByKeyPath( [
					Constants.Z_ARGUMENT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				const argLabels = argLabelsRow ?
					getters.getChildrenByParentRowId( argLabelsRow.id ).slice( 1 ) :
					[];
				const argLabel = argLabels.find( ( monolingual ) => {
					const langZid = getters.getZMonolingualLangValue( monolingual.id );
					return langZid === lang;
				} );
				return argLabel;
			}
			return findArgumentLabel;
		}
	}
};
