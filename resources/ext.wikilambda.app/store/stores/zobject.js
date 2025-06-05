/*!
 * WikiLambda Vue editor: ZObject Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Row = require( '../classes/Row.js' );
const Constants = require( '../../Constants.js' );
const { fetchZObjects } = require( '../../utils/apiUtils.js' );
const { getParameterByName } = require( '../../utils/urlUtils.js' );
const { extractWikidataLexemeIds } = require( '../../utils/wikidataUtils.js' );
const { extractZIDs, hybridToCanonical } = require( '../../utils/schemata.js' );
const { findKeyInArray, isTruthyOrEqual } = require( '../../utils/typeUtils.js' );
const { convertJsonToTable, convertTableToJson } = require( '../../utils/zobjectUtils.js' );
const currentPageStore = require( './zobject/currentPage.js' );
const factoryStore = require( './zobject/factory.js' );
const submissionStore = require( './zobject/submission.js' );

const zobjectStore = {
	state: {
		zobject: []
	},

	getters: {
		/**
		 * Returns the whole state zobject table object
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getZObjectTable: function ( state ) {
			return state.zobject;
		},

		/**
		 * Return a specific zObject key given its row ID or
		 * undefined if the row ID doesn't exist
		 *
		 * @return {Function}
		 */
		getZObjectKeyByRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZObjectKeyByRowId = ( rowId ) => {
				const row = this.getRowById( rowId );
				return row !== undefined ? row.key : undefined;
			};
			return findZObjectKeyByRowId;
		},

		/**
		 * Returns string with the value if the row exists and
		 * is terminal, else returns undefined
		 *
		 * @return {Function}
		 */
		getZObjectValueByRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} terminal value
			 */
			const findZObjectValueByRowId = ( rowId ) => {
				const row = this.getRowById( rowId );
				return row !== undefined && row.isTerminal() ? row.value : undefined;
			};
			return findZObjectValueByRowId;
		},

		/**
		 * Returns the depth (from 0 to n) of the zobject
		 * represented by a given rowId
		 *
		 * @return {Function}
		 */
		getDepthByRowId: function () {
			/**
			 * @param {number} rowId
			 * @param {number} depth
			 * @return {number}
			 */
			const findDepthByRowId = ( rowId, depth = 0 ) => {
				const row = this.getRowById( rowId );
				return !row || row.parent === undefined ? depth : findDepthByRowId( row.parent, depth + 1 );
			};
			return findDepthByRowId;

		},

		/**
		 * Returns the row Id where the persistent object value starts (Z2K2 key)
		 *
		 * @return {Function}
		 */
		getZPersistentContentRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZPersistentContentRowId = ( rowId = 0 ) => {
				const row = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_VALUE ], rowId );
				return row ? row.id : undefined;
			};
			return findZPersistentContentRowId;
		},

		/**
		 * Returns an array of all the ZMonolingualString languages
		 * available in the persistent object Name/Label key (Z2K3).
		 *
		 * @return {Function}
		 */
		getZPersistentNameLangs: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findZPersistentNameLangs = ( rowId = 0 ) => {
				const nameRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				return nameRow ? this.getZMultilingualLanguageList( nameRow.id ) : [];
			};
			return findZPersistentNameLangs;
		},

		/**
		 * Returns an array of all the ZMonolingualString languages
		 * available in the persistent object Description key (Z2K5).
		 *
		 * @return {Function}
		 */
		getZPersistentDescriptionLangs: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findZPersistentDescriptionLangs = ( rowId = 0 ) => {
				const descriptionRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				], rowId );
				return descriptionRow ? this.getZMultilingualLanguageList( descriptionRow.id ) : [];
			};
			return findZPersistentDescriptionLangs;
		},

		/**
		 * Returns an array of all the ZMonolingualStringSet objects
		 * (their language and their rowId) that are available in
		 * the persistent object Aliases key (Z2K4).
		 *
		 * @return {Function}
		 */
		getZPersistentAliasLangs: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findZPersistentAliasLangs = ( rowId = 0 ) => {
				const aliasRow = this.getRowByKeyPath( [
					Constants.Z_PERSISTENTOBJECT_ALIASES,
					Constants.Z_MULTILINGUALSTRINGSET_VALUE
				], rowId );
				// Return empty array if row does not exist
				if ( aliasRow === undefined ) {
					return [];
				}
				const allAlias = this.getChildrenByParentRowId( aliasRow.id ).slice( 1 );
				return allAlias.map( ( mono ) => this.getZMonolingualStringsetLang( mono.id ) );
			};
			return findZPersistentAliasLangs;
		},

		/**
		 * Returns the row of the monolingual string that contains the
		 * name for the ZPersistent object for a given language Zid.
		 * If there's no monolingual string for this language, returns
		 * undefined.
		 *
		 * @return {Function}
		 */
		getZPersistentName: function () {
			/**
			 * @param {string} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findZPersistentName = ( langZid, rowId = 0 ) => {
				const name = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_LABEL ], rowId );
				return name ? this.getZMonolingualForLanguage( langZid, name.id ) : undefined;
			};
			return findZPersistentName;
		},

		/**
		 * Returns the row of the monolingual string that contains the
		 * description for the ZPersistent object for a given language Zid.
		 * If there's no monolingual string for this language, returns
		 * undefined.
		 *
		 * @return {Function}
		 */
		getZPersistentDescription: function () {
			/**
			 * @param {string} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findZPersistentDescription = ( langZid, rowId = 0 ) => {
				const description = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ], rowId );
				return description ? this.getZMonolingualForLanguage( langZid, description.id ) : undefined;
			};
			return findZPersistentDescription;
		},

		/**
		 * Returns the alias for the ZPersistent object for a given
		 * lang Zid. If no alias exist for the given language, returns
		 * an empty array.
		 *
		 * @return {Function}
		 */
		getZPersistentAlias: function () {
			/**
			 * @param {string} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findZPersistentAlias = ( langZid, rowId = 0 ) => {
				const aliases = this.getRowByKeyPath( [ Constants.Z_PERSISTENTOBJECT_ALIASES ], rowId );
				return aliases ? this.getZMonolingualStringsetForLanguage( langZid, aliases.id ) : undefined;
			};
			return findZPersistentAlias;
		},

		/**
		 * Returns a list of all the language Zids that are present in
		 * the multilingual data collection (must have at least a name,
		 * a description, a set of aliases and any input labels).
		 *
		 * @return {Function}
		 */
		getMultilingualDataLanguages: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findMultilingualDataLanguages = ( rowId = 0 ) => {
				// Get languages available in name, description and alias fields
				const nameLangs = this.getZPersistentNameLangs( rowId );
				const descriptionLangs = this.getZPersistentDescriptionLangs( rowId );
				const aliasLangs = this.getZPersistentAliasLangs( rowId );

				// Get languages available in input labels if object is a function
				const inputLangs = this.getZFunctionInputLangs( rowId );

				// Combine all languages and return the array of unique languageZids
				const allLangs = nameLangs.concat( descriptionLangs, aliasLangs, ...inputLangs );
				return [ ...new Set( allLangs ) ];
			};
			return findMultilingualDataLanguages;
		},

		/**
		 * Returns the terminal value of Z6K1/String value of a ZObject
		 * assumed to be a string
		 *
		 * @return {Function}
		 */
		getZStringTerminalValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZStringTerminalValue = ( rowId ) => this.getZObjectTerminalValue(
				rowId,
				Constants.Z_STRING_VALUE
			);
			return findZStringTerminalValue;
		},

		/**
		 * Returns the terminal value of Z9K1/Reference value of a ZObject
		 * assumed to be a string
		 *
		 * @return {Function}
		 */
		getZReferenceTerminalValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZReferenceTerminalValue = ( rowId ) => this.getZObjectTerminalValue(
				rowId,
				Constants.Z_REFERENCE_ID
			);
			return findZReferenceTerminalValue;
		},

		/**
		 * Returns the terminal value of Z18K1/Argument Reference
		 *
		 * @return {Function}
		 */
		getZArgumentReferenceTerminalValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			return ( rowId ) => {
				const valueRow = this.getRowByKeyPath( [ Constants.Z_ARGUMENT_REFERENCE_KEY ], rowId );
				return valueRow ? this.getZStringTerminalValue( valueRow.id ) : undefined;
			};
		},

		/**
		 * Returns the terminal value of Z11K2
		 *
		 * @return {Function}
		 */
		getZMonolingualTextValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZMonolingualTextValue = ( rowId ) => {
				const stringRow = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRING_VALUE ], rowId );
				return stringRow ? this.getZStringTerminalValue( stringRow.id ) : undefined;
			};
			return findZMonolingualTextValue;
		},

		/**
		 * Returns the terminal value of Z11K1
		 *
		 * @return {Function}
		 */
		getZMonolingualLangValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZMonolingualLangValue = ( rowId ) => {
				const langRow = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRING_LANGUAGE ], rowId );
				if ( !langRow ) {
					return undefined;
				}
				const zObjectType = this.getZObjectTypeByRowId( langRow.id );

				// If zobject language type is a natural language, return the
				// language code value
				if ( zObjectType === Constants.Z_NATURAL_LANGUAGE ) {
					return this.getRowByKeyPath( [
						Constants.Z_NATURAL_LANGUAGE_ISO_CODE,
						Constants.Z_STRING_VALUE
					], langRow.id ).value;
				}

				return this.getZReferenceTerminalValue( langRow.id );
			};
			return findZMonolingualLangValue;
		},

		/**
		 * Returns the terminal value of Z31K2, which is an
		 * array of strings.
		 *
		 * @return {Function}
		 */
		getZMonolingualStringsetValues: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findZMonolingualStringsetValues = ( rowId ) => {
				const listRow = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ], rowId );
				if ( listRow === undefined ) {
					return [];
				}
				const list = this.getChildrenByParentRowId( listRow.id ).slice( 1 );
				return list.map( ( stringRow ) => ( {
					rowId: stringRow.id,
					value: this.getZStringTerminalValue( stringRow.id )
				} ) );
			};
			return findZMonolingualStringsetValues;
		},

		/**
		 * Returns the terminal value of Z31K1
		 *
		 * @return {Function}
		 */
		getZMonolingualStringsetLang: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined} rowId
			 */
			const findZMonolingualStringsetLang = ( rowId ) => {
				const langRow = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ], rowId );
				if ( langRow === undefined ) {
					return undefined;
				}
				const zObjectType = this.getZObjectTypeByRowId( langRow.id );

				// If zobject language type is a natural language, return the
				// language code value
				if ( zObjectType === Constants.Z_NATURAL_LANGUAGE ) {
					return this.getRowByKeyPath( [
						Constants.Z_NATURAL_LANGUAGE_ISO_CODE,
						Constants.Z_STRING_VALUE
					], langRow.id ).value;
				}

				return this.getZReferenceTerminalValue( langRow.id );
			};
			return findZMonolingualStringsetLang;
		},

		/**
		 * Returns the zid of the function given the rowId of a function call
		 *
		 * @return {Function}
		 */
		getZFunctionCallFunctionId: function () {
			/**
			 * @param {string} rowId
			 * @return {string | undefined}
			 */
			const findZFunctionCallFunctionId = ( rowId ) => {
				const zFunction = this.getRowByKeyPath(
					[ Constants.Z_FUNCTION_CALL_FUNCTION ],
					rowId
				);
				if ( !zFunction ) {
					return undefined;
				}
				return this.getZObjectTerminalValue( zFunction.id, Constants.Z_REFERENCE_ID );
			};
			return findZFunctionCallFunctionId;
		},

		/**
		 * Returns the argument key-values of a function call given the
		 * rowId of the function call object.
		 *
		 * @return {Function}
		 */
		getZFunctionCallArguments: function () {
			/**
			 * @param {string} rowId
			 * @return {Array}
			 */
			const findZFunctionCallArguments = ( rowId ) => {
				const children = this.getChildrenByParentRowId( rowId );
				return children.filter( ( row ) => row.key !== Constants.Z_OBJECT_TYPE &&
					row.key !== Constants.Z_FUNCTION_CALL_FUNCTION );
			};
			return findZFunctionCallArguments;
		},

		/**
		 * Returns the row ID of the target function of a tester
		 * given the tester rowId
		 *
		 * @return {Function}
		 */
		getZTesterFunctionRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZTesterFunctionRowId = ( rowId ) => {
				const functionRef = this.getRowByKeyPath( [ Constants.Z_TESTER_FUNCTION ], rowId );
				if ( functionRef === undefined ) {
					return undefined;
				}
				return functionRef.id;
			};
			return findZTesterFunctionRowId;
		},

		/**
		 * Returns the row ID of the call function call of a tester
		 * given the tester rowId
		 *
		 * @return {Function}
		 */
		getZTesterCallRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZTesterCallRowId = ( rowId ) => {
				const callRow = this.getRowByKeyPath( [ Constants.Z_TESTER_CALL ], rowId );
				if ( callRow === undefined ) {
					return undefined;
				}
				return callRow.id;
			};
			return findZTesterCallRowId;
		},

		/**
		 * Returns the row ID of the validation function call of a tester
		 * given the tester rowId
		 *
		 * @return {Function}
		 */
		getZTesterValidationRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZTesterValidationRowId = ( rowId ) => {
				const validationRow = this.getRowByKeyPath( [ Constants.Z_TESTER_VALIDATION ], rowId );
				if ( validationRow === undefined ) {
					return undefined;
				}
				return validationRow.id;
			};
			return findZTesterValidationRowId;
		},

		/**
		 * Returns the row ID of the target function of an implementation
		 * given the implementation rowId
		 *
		 * @return {Function}
		 */
		getZImplementationFunctionRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZImplementationFunctionRowId = ( rowId ) => {
				const functionRef = this.getRowByKeyPath( [ Constants.Z_IMPLEMENTATION_FUNCTION ], rowId );
				if ( functionRef === undefined ) {
					return undefined;
				}
				return functionRef.id;
			};
			return findZImplementationFunctionRowId;
		},

		/**
		 * Returns the terminal function Zid of the target function of an implementation
		 * given the implementation rowId
		 *
		 * @return {Function}
		 */
		getZImplementationFunctionZid: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findZImplementationFunctionZid = ( rowId ) => {
				const functionRowId = this.getZImplementationFunctionRowId( rowId );
				return functionRowId ? this.getZReferenceTerminalValue( functionRowId ) : undefined;
			};
			return findZImplementationFunctionZid;
		},

		/**
		 * Returns the type of implementation selected for a given
		 * implementation rowId. The type is what of all mutually exclusive
		 * keys is present in the current implementation: Z14K2 (composition),
		 * Z14K3 (code) or Z14K4 (builtin).
		 *
		 * @return {Function}
		 */
		getZImplementationContentType: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZImplementationContentType = ( rowId ) => {
				const children = this.getChildrenByParentRowId( rowId );
				// get all child keys and remove Z1K1 and Z14K1
				const childKeys = children
					.filter( ( child ) => {
						const allowedKeys = [
							Constants.Z_IMPLEMENTATION_CODE,
							Constants.Z_IMPLEMENTATION_COMPOSITION,
							Constants.Z_IMPLEMENTATION_BUILT_IN
						];
						return allowedKeys.includes( child.key ) && child.value !== undefined;
					} )
					.map( ( child ) => child.key );
				// childKeys should only have one element after the filtering
				return childKeys.length === 1 ? childKeys[ 0 ] : undefined;
			};
			return findZImplementationContentType;
		},

		/**
		 * Returns the rowId for the implementation content given
		 * an implementation rowId and the type of content defined
		 * by its key (Z14K2 for composition and Z14K3 for code)
		 *
		 * @return {Function}
		 */
		getZImplementationContentRowId: function () {
			/**
			 * @param {number} rowId
			 * @param {string} key
			 * @return {number | undefined}
			 */
			const findZImplementationContentRowId = ( rowId, key ) => {
				const row = this.getRowByKeyPath( [ key ], rowId );
				return row ? row.id : undefined;
			};
			return findZImplementationContentRowId;
		},

		/**
		 * Returns the terminal value of Z16K1
		 *
		 * @return {Function}
		 */
		getZCodeString: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZCodeString = ( rowId ) => {
				const codeRow = this.getRowByKeyPath( [ Constants.Z_CODE_CODE ], rowId );
				return codeRow ? this.getZStringTerminalValue( codeRow.id ) : undefined;
			};
			return findZCodeString;
		},

		/**
		 * Returns the row of a Z16/Code programming language key (Z16K1)
		 *
		 * @return {Function}
		 */
		getZCodeProgrammingLanguageRow: function () {
			/**
			 * @param {number} rowId
			 * @return {Row | undefined}
			 */
			const findZCodeProgrammingLanguageRow = ( rowId ) => this.getRowByKeyPath(
				[ Constants.Z_CODE_LANGUAGE ],
				rowId
			);
			return findZCodeProgrammingLanguageRow;
		},
		/**
		 * Returns the terminal reference Value of Z40K1
		 *
		 * @return {Function}
		 */
		getZBooleanValue: function () {
			/**
			 * @param {number} rowId
			 * @return {string | undefined}
			 */
			const findZBooleanValue = ( rowId ) => {
				const booleanRow = this.getRowByKeyPath( [ Constants.Z_BOOLEAN_IDENTITY ], rowId );

				if ( !booleanRow ) {
					return;
				}

				return this.getZReferenceTerminalValue( booleanRow.id );
			};
			return findZBooleanValue;
		},

		/**
		 * Returns the string or object representation for the type of the
		 * ZObject represented in the rowId passed as parameter. Returns
		 * undefined if no valid type is present.
		 *
		 * @return {Function}
		 */
		getZObjectTypeByRowId: function () {
			/**
			 * Retrieves the type representation of a given row.
			 *
			 * @param {Row} typeRow - The row to get the type representation for
			 * @return {string | Object | undefined} - The type representation
			 */
			const getTypeRepresentation = ( typeRow ) => {
				if ( !typeRow ) {
					return undefined;
				}
				if ( typeRow.isTerminal() ) {
					return typeRow.value;
				}

				const type = this.getZObjectTypeByRowId( typeRow.id );

				if ( type === Constants.Z_REFERENCE ) {
					return this.getZReferenceTerminalValue( typeRow.id );
				} else if ( type === Constants.Z_TYPE ) {
					const typeIdRow = this.getRowByKeyPath( [ Constants.Z_TYPE_IDENTITY ], typeRow.id );
					return getTypeRepresentation( typeIdRow );
				} else {
					return hybridToCanonical( this.getZObjectAsJsonById( typeRow.id ) );
				}
			};

			/**
			 * Finds the ZObject type by ID.
			 *
			 * @param {number} id - The row ID to find the type for
			 * @return {string | Object | undefined} - The ZObject type
			 */
			const findZObjectTypeById = ( id ) => {
				const row = this.getRowById( id );

				if ( !row || row.id === row.parent ) {
					return undefined;
				}

				if ( row.isTerminal() ) {
					return row.key === Constants.Z_REFERENCE_ID ?
						Constants.Z_REFERENCE :
						Constants.Z_STRING;
				}

				if ( row.isArray() ) {
					const itemTypeRow = this.getRowByKeyPath( [ '0' ], row.id );
					const itemType = getTypeRepresentation( itemTypeRow );

					return {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
						[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_LIST,
						[ Constants.Z_TYPED_LIST_TYPE ]: itemType || ''
					};
				}

				const typeRow = this.getRowByKeyPath( [ Constants.Z_OBJECT_TYPE ], id );
				return getTypeRepresentation( typeRow );
			};

			return findZObjectTypeById;
		},

		/**
		 * Returns the item type of a typed list given the parent
		 * rowId of the list object
		 *
		 * @return {Function}
		 */
		getTypedListItemType: function () {
			/**
			 * @param {number} parentRowId
			 * @return {string|Object|undefined}
			 */
			const findTypedListItemType = ( parentRowId ) => {
				const listType = this.getZObjectTypeByRowId( parentRowId );
				if ( !listType ) {
					return undefined;
				}
				return listType[ Constants.Z_TYPED_LIST_TYPE ];
			};
			return findTypedListItemType;
		},

		/**
		 * Returns the list of typed list item row ids (without the type item)
		 * given the parent rowId sorted by their key
		 *
		 * @return {Array}
		 */
		getTypedListItemsRowIds: function () {
			/**
			 * @param {string} rowId
			 * @return {number | undefined}
			 */
			const findTypedListItemsRowIds = ( rowId ) => this.getChildrenByParentRowId( rowId )
				.sort( ( a, b ) => parseInt( a.key ) - parseInt( b.key ) )
				.slice( 1 )
				.map( ( row ) => row.id );
			return findTypedListItemsRowIds;
		},

		/**
		 * Returns a particular key-value in the Metadata object given
		 * the Metadata object rowId and a string key. Returns undefined
		 * if nothing is found under the given key.
		 *
		 * @return {Function}
		 */
		getMapValueByKey: function () {
			/**
			 * @param {string} rowId
			 * @param {string} key
			 * @return {Row|undefined}
			 */
			const findMapValueByKey = ( rowId, key ) => {
				const listRow = this.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ], rowId );
				if ( !listRow ) {
					return undefined;
				}
				const pairs = this.getChildrenByParentRowId( listRow.id ).slice( 1 );
				for ( const pair of pairs ) {
					const keyRow = this.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ], pair.id );
					if ( !keyRow ) {
						continue;
					}
					const keyString = this.getZStringTerminalValue( keyRow.id );
					if ( keyString === key ) {
						return this.getRowByKeyPath( [ Constants.Z_TYPED_OBJECT_ELEMENT_2 ], pair.id );
					}
				}
				return undefined;
			};
			return findMapValueByKey;
		},

		/**
		 * Returns a row object given its row ID. Note that the row ID is its
		 * parameter row.id and it is different than the index
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getRowById: function ( state ) {
			/**
			 * @param {number|undefined} rowId
			 * @return {Row} row
			 */
			const findRowById = ( rowId ) => rowId === undefined ?
				undefined :
				state.zobject.find( ( item ) => item.id === rowId );
			return findRowById;
		},

		/**
		 * Returns all the children rows given a parent rowId, else
		 * returns an empty list.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getChildrenByParentRowId: function ( state ) {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findChildrenByParentRowId = ( rowId ) => state.zobject.filter( ( row ) => ( row.parent === rowId ) );
			return findChildrenByParentRowId;
		},

		/**
		 * Return the next available array key or index given an
		 * array parent Id
		 *
		 * @return {Function}
		 */
		getNextArrayIndex: function () {
			/**
			 * @param {number} parentRowId
			 * @return {number}
			 */
			// TODO: should we check that the sequence of children keys is
			// continuous and doesn't have any gaps?
			const findNextArrayIndex = ( parentRowId ) => {
				const children = this.getChildrenByParentRowId( parentRowId );
				return children.length;
			};
			return findNextArrayIndex;
		},

		/**
		 * Return the parent rowId of a given rowId
		 *
		 * @return {Function}
		 */
		getParentRowId: function () {
			/**
			 * @param {number} rowId
			 * @return {number | undefined}
			 */
			const findParentRowId = ( rowId ) => {
				const row = this.getRowById( rowId );
				return row ? row.parent : undefined;
			};
			return findParentRowId;
		},
		/**
		 * Given a starting rowId and an array of keys that form a path,
		 * follow that path down and return the resulting row.
		 *
		 * @return {Function}
		 */
		getRowByKeyPath: function () {
			/**
			 * @param {Array} path sequence of keys that specify a path to follow down the ZObject
			 * @param {number} rowId starting row Id
			 * @return {Row|undefined} resulting row or undefined if not found
			 */
			const findRowByKeyPath = ( path = [], rowId = 0 ) => {
				if ( path.length === 0 ) {
					return this.getRowById( rowId );
				}

				const head = path[ 0 ];
				const tail = path.slice( 1 );
				const children = this.getChildrenByParentRowId( rowId );
				const child = children.find( ( row ) => ( row.key === head ) );

				return ( child === undefined ) ? undefined : this.getRowByKeyPath( tail, child.id );
			};
			return findRowByKeyPath;
		},

		/**
		 * Returns the terminal value of a Z9/Reference or a Z6/String
		 * nested under a sequence of their keys.
		 *
		 * E.g. getZObjectTerminalValue( rowId, Z9K1 ) would return the
		 * terminal value in objects like { Z9K1: { Z9K1: "value" }},
		 * { Z9K1: "value"} or "value"
		 *
		 * This is a generalized method to be called from the specific
		 * methods getZStringTerminalValue or getZReferenceTerminalValue
		 *
		 * @return {Function}
		 */
		getZObjectTerminalValue: function () {
			/**
			 * @param {number} rowId an integer representing an existing rowId
			 * @param {string} terminalKey either string or reference terminal key
			 * @return {string | undefined}
			 */
			const findZObjectTerminalValue = ( rowId, terminalKey ) => {
				const row = this.getRowById( rowId );
				// Row not found is undefined
				if ( row === undefined ) {
					return undefined;
				}
				if ( row.isTerminal() ) {
					if ( terminalKey === Constants.Z_STRING_VALUE ) {
						return row.value;
					} else {
						return row.value ? row.value : undefined;
					}
				} else {
					const valueRow = this.getRowByKeyPath( [ terminalKey ], row.id );
					return valueRow ? this.getZObjectTerminalValue( valueRow.id, terminalKey ) : undefined;
				}
			};
			return findZObjectTerminalValue;
		},

		/**
		 * Returns the next available rowId
		 *
		 * @param {Object} state
		 * @return {number}
		 */
		getNextRowId: function ( state ) {
			let highestObjectId = 0;

			if ( !state.zobject || state.zobject.length === 0 ) {
				return highestObjectId;
			}

			state.zobject.forEach( ( item ) => {
				if ( item.id > highestObjectId ) {
					highestObjectId = item.id;
				}
			} );

			return highestObjectId + 1;
		},

		/**
		 * Returns whether the rowId is inside an implementation
		 * composition (Z14K2), which will determine whether
		 * we can use argument references in its type selectors.
		 *
		 * @return {Function}
		 */
		isInsideComposition: function () {
			/**
			 * @param {number} rowId
			 * @return {boolean}
			 */
			const checkIsInsideComposition = ( rowId ) => {
				const row = this.getRowById( rowId );
				if ( !row ) {
					// Not found or reached the root, return false and end
					return false;
				}
				return ( row.key === Constants.Z_IMPLEMENTATION_COMPOSITION ) ?
					true :
					this.isInsideComposition( row.parent );
			};
			return checkIsInsideComposition;
		},

		/**
		 * Return the monolingual string object row belonging
		 * to a given language and multilingual string rowId,
		 * or undefined if there is no monolingual string for
		 * this language.
		 *
		 * @return {Function}
		 */
		getZMonolingualForLanguage: function () {
			/**
			 * @param {string} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findZMonolingualForLanguage = ( langZid, rowId ) => {
				const list = this.getRowByKeyPath( [ Constants.Z_MULTILINGUALSTRING_VALUE ], rowId );
				if ( !list ) {
					return undefined;
				}
				// get monolingual objects
				const children = this.getChildrenByParentRowId( list.id ).slice( 1 );
				for ( const child of children ) {
					const monoLangRow = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRING_LANGUAGE ], child.id );
					const monoLangZid = this.getZReferenceTerminalValue( monoLangRow ? monoLangRow.id : undefined );
					if ( langZid === monoLangZid ) {
						return child;
					}
				}
				return undefined;
			};
			return findZMonolingualForLanguage;
		},

		/**
		 * Return the monolingual stringset object row belonging
		 * to a given language and multilingual stringset rowId,
		 * or undefined if there is no monolingual stringset for
		 * this language.
		 *
		 * @return {Function}
		 */
		getZMonolingualStringsetForLanguage: function () {
			/**
			 * @param {string} langZid
			 * @param {number} rowId
			 * @return {Object|undefined}
			 */
			const findZMonolingualStringsetForLanguage = ( langZid, rowId ) => {
				const list = this.getRowByKeyPath( [ Constants.Z_MULTILINGUALSTRINGSET_VALUE ], rowId );
				if ( !list ) {
					return undefined;
				}
				// get monolingual objects
				const children = this.getChildrenByParentRowId( list.id ).slice( 1 );
				for ( const child of children ) {
					const row = this.getRowByKeyPath( [ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ], child.id );
					const zid = this.getZReferenceTerminalValue( row ? row.id : undefined );
					if ( langZid === zid ) {
						return child;
					}
				}
				return undefined;
			};
			return findZMonolingualStringsetForLanguage;
		},

		/**
		 * Returns the list of language zids represented in a given
		 * ZMonolingualStrings (E.g. Name or Description) given the
		 * rowId where the content of the ZMulilingualString Value/Z12K1
		 * starts.
		 *
		 * @return {Function}
		 */
		getZMultilingualLanguageList: function () {
			/**
			 * @param {number} rowId
			 * @return {Array}
			 */
			const findZMultilingualLanguageList = ( rowId ) => {
				const listRow = this.getRowById( rowId );
				if ( !listRow || !listRow.isArray() ) {
					return [];
				}
				const allMonolinguals = this.getChildrenByParentRowId( rowId ).slice( 1 );
				return allMonolinguals.map( ( mono ) => this.getZMonolingualLangValue( mono.id ) );
			};
			return findZMultilingualLanguageList;
		},

		/**
		 * Return the JSON representation of a specific zObject and its children
		 * using the zObject id value within the zObject array
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZObjectAsJsonById: function ( state ) {
			/**
			 * @param {number} id
			 * @param {boolean} isArray
			 * @return {Array} zObjectJson
			 */
			const findZObjectAsJsonById = ( id, isArray ) => convertTableToJson(
				state.zobject,
				id,
				isArray
			);
			return findZObjectAsJsonById;
		},

		/**
		 * Return the complete zObject as a JSON
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getZObjectAsJson: function ( state ) {
			return this.getZObjectAsJsonById( 0, state.zobject[ 0 ].isArray() );
		},

		/**
		 * Return the next key of the root ZObject. So if the current object is a Z408
		 * and there are currently 2 keys, it will return Z408K3.
		 *
		 * @param {Object} state
		 * @return {string} nextKey
		 */
		getNextKey: function ( state ) {
			const zid = this.getCurrentZObjectId;
			const keyRegex = new RegExp( '^' + zid + 'K([0-9]+)$' );
			const defaultKey = 0;
			const lastKey = Math.max(
				defaultKey,
				...state.zobject.map( ( item ) => {
					const match = item.isTerminal() && item.value.match( keyRegex );
					return match ? parseInt( match[ 1 ], 10 ) : -1;
				} )
			);
			const nextKey = lastKey + 1;
			return zid + 'K' + nextKey;
		},

		/**
		 * Return the index of a zObject by its row ID
		 * for internal use.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getRowIndexById: function ( state ) {
			/**
			 * @param {number} id
			 * @return {number} index
			 */
			const findRowIndexById = ( id ) => state.zobject.findIndex( ( item ) => item.id === id );
			return findRowIndexById;
		},

		/**
		 * Return a deep copy of the current zobject table
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getZObjectCopy: function ( state ) {
			return state.zobject.map( ( row ) => new Row( row.id, row.key, row.value, row.parent ) );
		},

		/**
		 * Returns whether the key has a Is identity/Z3K4 key set to true,
		 * given the row ID of the key object
		 *
		 * @return {Function}
		 */
		getZKeyIsIdentity: function () {
			/**
			 * @param {string} zid
			 * @return {boolean}
			 */
			const findZKeyIsIdentity = ( zid ) => {
				const isIdentity = this.getRowByKeyPath( [ Constants.Z_KEY_IS_IDENTITY ], zid );
				if ( !isIdentity ) {
					return false;
				}

				let boolValue = '';
				const type = this.getZObjectTypeByRowId( isIdentity.id );
				if ( type === Constants.Z_BOOLEAN ) {
					boolValue = this.getZBooleanValue( isIdentity.id );
				} else if ( type === Constants.Z_REFERENCE ) {
					boolValue = this.getZReferenceTerminalValue( isIdentity.id );
				}

				return boolValue === Constants.Z_BOOLEAN_TRUE;
			};
			return findZKeyIsIdentity;
		},

		/**
		 * Retuns the rowId of the key type field given the key rowId
		 *
		 * @return {Function}
		 */
		getZKeyTypeRowId: function () {
			/**
			 * @param {string} rowId
			 * @return {number | undefined}
			 */
			const findZKeyTypeRowId = ( rowId ) => {
				const keyType = this.getRowByKeyPath( [ Constants.Z_KEY_TYPE ], rowId );
				return keyType ? keyType.id : undefined;
			};
			return findZKeyTypeRowId;
		},

		/**
		 * Retuns the value of the identity key of a converter object given the
		 * rowId and the type of converter (Serialiser/Z64 or Deserialiser/Z46)
		 *
		 * @return {Function}
		 */
		getConverterIdentity: function () {
			/**
			 * @param {number} rowId
			 * @param {string} type
			 * @return {string | undefined}
			 */
			const findConverterIdentity = ( rowId, type ) => {
				if ( type !== Constants.Z_DESERIALISER && type !== Constants.Z_SERIALISER ) {
					return undefined;
				}
				const identityKey = `${ type }K1`;
				const identityKeyRow = this.getRowByKeyPath( [ identityKey ], rowId );
				return identityKeyRow ? this.getZReferenceTerminalValue( identityKeyRow.id ) : undefined;
			};
			return findConverterIdentity;
		},

		/**
		 * Recursively waks a nested generic type and returns
		 * the field IDs and whether they are valid or not.
		 *
		 * @return {Function}
		 */
		validateGenericType: function () {
			/**
			 * @param {number} rowId
			 * @param {Object} fields
			 * @return {Object} fields
			 */
			const checkValidateGenericType = ( rowId, fields = [] ) => {
				const mode = this.getZObjectTypeByRowId( rowId );
				const value = ( mode === Constants.Z_REFERENCE ) ?
					this.getZReferenceTerminalValue( rowId ) :
					this.getZFunctionCallFunctionId( rowId );

				fields.push( {
					rowId,
					isValid: !!value
				} );

				if ( mode === Constants.Z_FUNCTION_CALL ) {
					const args = this.getZFunctionCallArguments( rowId );
					for ( const arg of args ) {
						this.validateGenericType( arg.id, fields );
					}
				}
				return fields;
			};
			return checkValidateGenericType;
		}
	},
	actions: {
		/**
		 * This is the most atomic setter. It sets the value
		 * of a given row, given the rowIndex and the value.
		 *
		 * @param {Object} payload
		 * @param {number} payload.index
		 * @param {string|undefined} payload.value
		 */
		setValueByRowIndex: function ( payload ) {
			const item = this.zobject[ payload.index ];
			item.value = payload.value;
			// Modification of an array item cannot be detected
			// so it's not reactive. That's why we must run splice
			this.zobject.splice( payload.index, 1, item );
		},

		/**
		 * This is the most atomic setter. It sets the key of
		 * a given row, given the rowIndex and the key value.
		 *
		 * @param {Object} payload
		 * @param {number} payload.index
		 * @param {string|undefined} payload.key
		 */
		setKeyByRowIndex: function ( payload ) {
			const item = this.zobject[ payload.index ];
			item.key = payload.key;
			// Modification of an array item cannot be detected
			// so it's not reactive. That's why we must run splice
			this.zobject.splice( payload.index, 1, item );
		},

		/**
		 * Push a row into the zobject state. The row already
		 * has the necessary IDs and details set, so it is not
		 * necessary to recalculate anything nor look at the
		 * table indices, simply push.
		 *
		 * @param {Row} row
		 */
		pushRow: function ( row ) {
			// Make sure that all the rows pushed into the state are instances of Row
			if ( row instanceof Row ) {
				this.zobject.push( row );
			} else {
				this.zobject.push( new Row( row.id, row.key, row.value, row.parent ) );
			}
		},

		/**
		 * Set the whole state zobject with an array of Rows
		 * It's used in the initial setup and to restore
		 * the initial state of the object when attaching
		 * or detaching implementations or testers fails.
		 * It's important to always make sure that the
		 * payload is an Array of Row objects.
		 *
		 * @param {Row[]} payload
		 */
		setZObject: function ( payload ) {
			this.zobject = payload;
		},

		/**
		 * Removes the Row at the given index of the state zobject
		 *
		 * @param {number} index
		 */
		removeRowByIndex: function ( index ) {
			this.zobject.splice( index, 1 );
		},

		/**
		 * Handles the initialization of the pages given wgWikiLambda config
		 * The page can be:
		 * 1. A Create New ZObject page, when the flag createNewPage is true-
		 * 2. A Run Function page, when the flag runFunction is true or the
		 *    zid property is empty.
		 * 3. A View or Edit page of a persisted ZObject given its zid.
		 *
		 * @return {Promise}
		 */
		initializeView: function () {
			const { createNewPage, runFunction, zId } = this.getWikilambdaConfig;

			// If createNewPage is true, ignore runFunction and any specified ZID.
			if ( createNewPage ) {
				return this.initializeCreateNewPage();

				// If runFunction is true, ignore any specified ZID.
				// If no ZID specified, assume runFunction is true.
			} else if ( runFunction || !zId ) {
				return this.initializeEvaluateFunction();

				// Else, this is a view or edit page of an existing ZObject, so we
				// fetch the info and set the root ZObject with the persisted data.
			} else {
				return this.initializeRootZObject( zId );
			}
		},

		/**
		 * Initializes an Evaluate Function Call page, setting the root blank
		 * function call object.
		 *
		 * @return {Promise}
		 */
		initializeEvaluateFunction: function () {
			// Reset state.zobject to initial state
			this.setZObject( [] );

			// Set current Zid to empty placeholder (Z0)
			this.setCurrentZid( Constants.NEW_ZID_PLACEHOLDER );

			// Create root row for the blank object
			const rootRow = new Row( 0, undefined, Constants.ROW_VALUE_OBJECT, undefined );
			this.pushRow( rootRow );

			// Set the blank ZObject as a new ZFunctionCall
			return this.changeType( {
				id: 0,
				type: Constants.Z_FUNCTION_CALL
			} ).then( () => this.setInitialized( true ) );
		},

		/**
		 * Initializes a Create New ZObject page, setting the root blank
		 * persistent object and setting the internal type to a given one, if
		 * provided in the url Zid property.
		 *
		 * @return {Promise}
		 */
		initializeCreateNewPage: function () {
			// Reset state.zobject to initial state
			this.setZObject( [] );

			// Set createNewPage flag to true
			this.setCreateNewPage( true );

			// Set current Zid to empty placeholder (Z0)
			this.setCurrentZid( Constants.NEW_ZID_PLACEHOLDER );

			// Create root row for the blank object
			const rootRow = new Row( 0, undefined, Constants.ROW_VALUE_OBJECT, undefined );
			this.pushRow( rootRow );

			// Set the blank ZObject as a new ZPersistentObject
			return this.changeType( {
				id: 0,
				type: Constants.Z_PERSISTENTOBJECT
			} ).then( () => {
				// If `zid` url parameter is found, the new ZObject
				// will be of the given type.
				const defaultType = getParameterByName( 'zid' );
				let defaultKeys;

				this.setInitialized( true );

				// No `zid` parameter, return.
				if ( !defaultType || !defaultType.match( /Z[1-9]\d*$/ ) ) {
					return;
				}

				// Else, fetch `zid` and make sure it's a type
				return this.fetchZids( { zids: [ defaultType ] } )
					.then( () => {
						const Z2K2 = findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, this.zobject );
						defaultKeys = this.getStoredObject( defaultType );

						// If `zid` is not a type, return.
						if ( !defaultKeys ||
                            defaultKeys[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ] !==
                            Constants.Z_TYPE
						) {
							return;
						}

						// If `zid` is a type, dispatch `changeType` action
						return this.changeType( {
							id: Z2K2.id,
							type: defaultType,
							literal: true
						} );
					} );
			} );
		},

		/**
		 * Initializes a view or edit page of a given zid from a persisted ZObject.
		 * Calls to the wikilambdaload_zobjects API to fetch the root Zobject of the page
		 * with all its unfiltered content (all language labels, etc). This call is done
		 * only once and the method is separate from fetchZids because the logic to
		 * treat the result is extremely different.
		 *
		 * @param {string} zId
		 * @return {Promise}
		 */
		initializeRootZObject: function ( zId ) {
			// Reset state.zobject to initial state
			this.setZObject( [] );

			// Set current Zid
			this.setCurrentZid( zId );
			const revision = getParameterByName( 'oldid' );

			// Calling the API without language parameter so that we get
			// the unfiltered multilingual object
			return fetchZObjects( {
				zids: zId,
				revisions: revision || undefined
			} ).then( ( response ) => {
				const zobject = response[ zId ].data;

				// Initialize optional aliases key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_ALIASES ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRINGSET,
						Z32K1: [
							Constants.Z_MONOLINGUALSTRINGSET
						]
					};
				}

				// Initialize optional description key if absent
				if ( !zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] ) {
					zobject[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ] = {
						Z1K1: Constants.Z_MULTILINGUALSTRING,
						Z12K1: [
							Constants.Z_MONOLINGUALSTRING
						]
					};
				}

				// If object is Type/Z4, on edit mode, and user has permission to edit types,
				// initialize falsy fields to allow users to change them.
				//
				// NOTE: This has the potential of adding unrelated edits to types,
				// e.g. if a user edits a label and the identity flag was missing (falsy),
				// the identity flag will be saved as false. This is why we need to restrict
				// this initialization only to users that have the right to edit types.
				if ( !this.getViewMode &&
                    this.userCanEditTypes &&
					isTruthyOrEqual( zobject, [
						Constants.Z_PERSISTENTOBJECT_VALUE,
						Constants.Z_OBJECT_TYPE ], Constants.Z_TYPE
					) ) {
					// 1. Initialize type function keys (Z4K3, Z4K4, Z4K5 and Z4K6)
					const refs = [
						Constants.Z_TYPE_VALIDATOR,
						Constants.Z_TYPE_EQUALITY,
						Constants.Z_TYPE_RENDERER,
						Constants.Z_TYPE_PARSER
					];
					for ( const key of refs ) {
						if ( !isTruthyOrEqual( zobject, [ Constants.Z_PERSISTENTOBJECT_VALUE, key ] ) ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ] = {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE,
								[ Constants.Z_REFERENCE_ID ]: ''
							};
						}
					}
					// 2. Initialize the converters' lists (Z4K7, Z4K8)
					const lists = {
						[ Constants.Z_TYPE_DESERIALISERS ]: Constants.Z_DESERIALISER,
						[ Constants.Z_TYPE_SERIALISERS ]: Constants.Z_SERIALISER
					};
					for ( const key in lists ) {
						if ( !isTruthyOrEqual( zobject, [ Constants.Z_PERSISTENTOBJECT_VALUE, key ] ) ) {
							zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ key ] = [ lists[ key ] ];
						}
					}
					// 3. Initialize keys' Is identity (Z3K4) field
					const keys = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ]
						// Skipping the initial value, the string 'Z3' (Benjamin list)
						.slice( 1 );
					for ( const key of keys ) {
						if ( !isTruthyOrEqual( key, [ Constants.Z_KEY_IS_IDENTITY ] ) ) {
							key[ Constants.Z_KEY_IS_IDENTITY ] = {
								[ Constants.Z_OBJECT_TYPE ]: Constants.Z_BOOLEAN,
								[ Constants.Z_BOOLEAN_IDENTITY ]: Constants.Z_BOOLEAN_FALSE
							};
						}
					}
				}

				// Save initial multilingual data values
				// so that About widget knows how to reset to original
				// state in the case of a publish cancelation action.
				this.saveMultilingualDataCopy( zobject );

				// Internal data fetch:
				// Get all ZObject Ids within the object
				const listOfZIdWithinObject = extractZIDs( zobject );
				this.fetchZids( { zids: listOfZIdWithinObject } );

				// External data fetch:
				// Get all Wikidata Ids within the object (if any)
				const listOfLexemeIds = extractWikidataLexemeIds( zobject );
				if ( listOfLexemeIds.length > 0 ) {
					this.fetchLexemes( { ids: listOfLexemeIds } );
				}

				// Convert to rows and set store:
				const zobjectRows = convertJsonToTable( zobject );
				this.setZObject( zobjectRows );

				// Set initialized as done:
				this.setInitialized( true );
			} );
		},

		/**
		 * Recalculate the internal keys of a ZList in its zobject table representation.
		 * This should be used when an item is removed from a ZList.
		 *
		 * @param {number} listRowId
		 */
		recalculateTypedListKeys: function ( listRowId ) {
			const children = this.getChildrenByParentRowId( listRowId );

			children.forEach( ( itemRow, index ) => {
				this.setKeyByRowIndex( {
					index: this.getRowIndexById( itemRow.id ),
					key: `${ index }`
				} );
			} );
		},

		/**
		 * Recalculate the keys and key values of a ZArgument or ZKey List.
		 *
		 * @param {Object} payload
		 * @param {number} payload.listRowId
		 * @param {string} payload.key
		 */
		recalculateKeys: function ( payload ) {
			const { listRowId, key } = payload;
			const items = this.getChildrenByParentRowId( listRowId ).slice( 1 );

			items.forEach( ( itemRow, index ) => {
				const itemKeyRow = this.getRowByKeyPath(
					[ key, Constants.Z_STRING_VALUE ],
					itemRow.id
				);
				if ( itemKeyRow ) {
					this.setValueByRowIndex( {
						index: this.getRowIndexById( itemKeyRow.id ),
						value: `${ this.getCurrentZObjectId }K${ index + 1 }`
					} );
				}
			} );
		},

		/**
		 * Remove a specific row given its rowId. This method does NOT remove
		 * the children of the given row.
		 * It also clears whatever errors are associated to this rowId.
		 *
		 * @param {number} rowId
		 */
		removeRow: function ( rowId ) {
			if ( rowId === null || rowId === undefined ) {
				return;
			}
			const rowIndex = this.getRowIndexById( rowId );
			if ( rowIndex > -1 ) {
				this.removeRowByIndex( rowIndex );
				this.clearErrors( rowId );
			}
		},

		/**
		 * Remove a given row and all the descending rows. It also clears
		 * whatever errors are associated to the children rowIds.
		 *
		 * @param {Object} payload
		 * @param {string} payload.rowId
		 * @param {boolean} payload.removeParent
		 */
		removeRowChildren: function ( payload ) {
			const { rowId, removeParent = false } = payload;
			if ( rowId === undefined || rowId === null ) {
				return;
			}

			// Remove children
			const childRows = this.getChildrenByParentRowId( rowId );
			childRows.forEach( ( child ) => {
				this.removeRowChildren( { rowId: child.id, removeParent: true } );
			} );

			// Remove parent
			if ( removeParent ) {
				this.removeRow( rowId );
			}
		},

		/**
		 * Set the value of a key.
		 * The value can be a terminal value (string) or it can be an array
		 * or an object. Depending on the kind of value passed, this method will
		 * handle all necessary changes:
		 * 1. Walk down the path passed as payload.keyPath and find the rowId
		 *    from which the changes should be made.
		 * 2. If the row is `undefined`, halt execution
		 * 3. If the value is a terminal value (string), call the setValue action
		 * 4. If the value is more complex, call the injectZObjectFromRowId action,
		 *    which will make sure that all the current children are deleted and
		 *    the necessary rows are inserted at non-colliding ids.
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {Array} payload.keyPath
		 * @param {Object|Array|string} payload.value
		 * @return {Promise}
		 */
		setValueByRowIdAndPath: function ( payload ) {
			// assume this isn't an append unless explicitly stated
			const append = payload.append ? payload.append : false;
			// 1. Find the row that will be parent for the given payload.value
			const row = this.getRowByKeyPath( payload.keyPath, payload.rowId );
			// 2. If the row is `undefined`, halt execution
			// 3. Is the value a string? Call atomic action setValueByRowId
			// 4. Is the value an object or array? Call action inject
			if ( row === undefined ) {
				return Promise.resolve();
			} else if ( typeof payload.value === 'string' ) {
				return Promise.resolve( this.setValueByRowId( { rowId: row.id, value: payload.value } ) );
			} else {
				return this.injectZObjectFromRowId( { rowId: row.id, value: payload.value, append } );
			}
		},

		/**
		 * Sets the argument keys to their initial blank values of a function call given
		 * its rowId when the function ID (Z7K1) changes, and removes the arguments of the
		 * old function id.
		 * Exception: When the function call is the value of a tester result validation (Z20K3)
		 * the first argument should not be added.
		 *
		 * @param {Object} payload
		 * @param {string} payload.parentId
		 * @param {string} payload.functionZid
		 * @return {Promise}
		 */
		setZFunctionCallArguments: function ( payload ) {
			const allActions = [];
			let newArgs = [];
			let newKeys = [];

			// 1. Get new argument definitions from payload.functionZid
			if ( payload.functionZid ) {
				newArgs = this.getInputsOfFunctionZid( payload.functionZid );
				newKeys = newArgs.map( ( arg ) => arg[ Constants.Z_ARGUMENT_KEY ] );
			}

			// 2. Get function call arguments from parentId
			const oldArgs = this.getZFunctionCallArguments( payload.parentId );
			const oldKeys = oldArgs.map( ( arg ) => arg.key );

			// 3. For every key of parent: if it's not in new keys, remove it
			oldArgs.forEach( ( arg ) => {
				if ( !newKeys.includes( arg.key ) ) {
					allActions.push( this.removeRowChildren( { rowId: arg.id, removeParent: true } ) );
				}
			} );

			// 4. For every key of new arguments: If parent doesn't have it, set it to blank object
			// 4.a. If parent key is a tester validation function, omit the first argument
			const parentRow = this.getRowById( payload.parentId );
			if ( parentRow.key === Constants.Z_TESTER_VALIDATION ) {
				newArgs.shift();
			}

			// 4.b. Initialize all the new function call arguments
			let zids = [];
			newArgs.forEach( ( arg ) => {
				if ( !oldKeys.includes( arg[ Constants.Z_ARGUMENT_KEY ] ) ) {
					const key = arg[ Constants.Z_ARGUMENT_KEY ];
					const type = arg[ Constants.Z_ARGUMENT_TYPE ];

					// 4.c. If the key is a Wikidata enum identity, set it to the placeholder Z0
					const presetValue = key === Constants.Z_WIKIDATA_ENUM_IDENTITY ?
						Constants.NEW_ZID_PLACEHOLDER :
						undefined;

					const value = this.createObjectByType( {
						type,
						value: presetValue
					} );

					// Asynchronously fetch the necessary zids. We don't need to wait
					// to the fetch call because these will only be needed for labels.
					zids = zids.concat( extractZIDs( { [ key ]: value } ) );
					allActions.push( this.injectKeyValueFromRowId( {
						rowId: payload.parentId,
						key,
						value
					} ) );
				}
			} );

			// 4.c. Make sure that all the newly added referenced zids are fetched
			zids = [ ...new Set( zids ) ];
			if ( zids.length > 0 ) {
				this.fetchZids( { zids } );
			}

			return Promise.all( allActions );
		},

		/**
		 * Sets the new implementation key and removes the previous one when changing
		 * an implementation content from code to composition or viceversa. These keys
		 * need to be exclusive and the content for the new key needs to be correctly
		 * initialized with either a ZCode/Z16 object or with a ZFunctionCall/Z7.
		 *
		 * @param {Object} payload
		 * @param {number} payload.parentId
		 * @param {string} payload.key
		 */
		setZImplementationContentType: function ( payload ) {
			const allKeys = [
				Constants.Z_IMPLEMENTATION_CODE,
				Constants.Z_IMPLEMENTATION_COMPOSITION,
				Constants.Z_IMPLEMENTATION_BUILT_IN
			];
			// Remove unchecked implementation types
			for ( const key of allKeys ) {
				if ( key !== payload.key ) {
					const keyRow = this.getRowByKeyPath( [ key ], payload.parentId );
					if ( keyRow ) {
						this.removeRowChildren( { rowId: keyRow.id, removeParent: true } );
					}
				}
			}
			// Get new implementation content
			const blankType = ( payload.key === Constants.Z_IMPLEMENTATION_CODE ) ?
				Constants.Z_CODE :
				Constants.Z_FUNCTION_CALL;
			const blankObject = this.createObjectByType( { type: blankType } );
			// Add new key-value
			this.injectKeyValueFromRowId( {
				rowId: payload.parentId,
				key: payload.key,
				value: blankObject
			} );
		},

		/**
		 * Sets the type of the Wikidata enum typed list of references (Z6884K2) to the given value.
		 *
		 * @param {Object} payload
		 * @param {number} payload.parentRowId - The parent row ID of the Wikidata enum.
		 * @param {string} payload.value - The new type to set.
		 */
		setZWikidataEnumReferencesType: function ( payload ) {
			const row = this.getRowByKeyPath( [ Constants.Z_WIKIDATA_ENUM_REFERENCES ], payload.parentRowId );
			if ( !row ) {
				return;
			}

			this.handleListTypeChange( {
				parentRowId: row.id,
				newListItemType: payload.value
			} );

			this.setValueByRowIdAndPath( {
				rowId: row.id,
				keyPath: [ '0', Constants.Z_REFERENCE_ID ],
				value: payload.value
			} );
		},

		/**
		 * Most atomic action to edit the state. Perform the atomic mutation (index, value)
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {Object|Array|string} payload.value
		 */
		setValueByRowId: function ( payload ) {
			if ( payload.rowId === undefined || payload.rowId === null ) {
				return;
			}
			this.setValueByRowIndex( {
				index: this.getRowIndexById( payload.rowId ),
				value: payload.value
			} );
		},

		/**
		 * Flattens an input ZObject into a table structure and inserts the rows
		 * into the global state. This action makes sure of a few things:
		 * 1. If it's called with a parent row, all the current children will
		 *    be removed, and the new children will be added with non-colliding IDs.
		 *    If the parent row is a list, the flag append will permit adding the new
		 *    value into the existing list items.
		 * 2. If it's called with no parent row, the ZObject will be inserted fully,
		 *    including a root row with parent and key set to undefined.
		 *
		 * @param {Object} payload
		 * @param {number|undefined} payload.rowId parent rowId or undefined if root
		 * @param {Object|Array|string} payload.value ZObject to inject
		 * @param {boolean | undefined} payload.append Flag to append the new object and not remove children
		 * @return {Promise}
		 */
		injectZObjectFromRowId: function ( payload ) {
			const hasParent = payload.rowId !== undefined;
			const allActions = [];
			let rows;

			if ( hasParent ) {
				let parentRow = this.getRowById( payload.rowId );
				const nextRowId = this.getNextRowId;

				// Convert input payload.value into table rows with parent
				if ( payload.append ) {
					// If we append to a list, calculate the index from which we need to enter the value
					const index = this.getNextArrayIndex( payload.rowId );
					rows = convertJsonToTable( payload.value, parentRow, nextRowId, true, index );
				} else {
					rows = convertJsonToTable( payload.value, parentRow, nextRowId );
				}

				// Reset the parent value in case it's changed
				parentRow = rows.shift();
				allActions.push( this.setValueByRowId( {
					rowId: parentRow.id,
					value: parentRow.value
				} ) );

				// Remove all necessary children that are dangling from this parent, if append is not set
				if ( !payload.append ) {
					allActions.push( this.removeRowChildren( { rowId: parentRow.id } ) );
				}
			} else {
				// Convert input payload.value into table rows with no parent
				rows = convertJsonToTable( payload.value );
			}

			// Push all the rows, they already have their required IDs
			rows.forEach( ( row ) => {
				allActions.push( this.pushRow( row ) );
			} );

			return Promise.all( allActions );
		},

		/**
		 * Given a key and a JSON object value, transforms into rows and inserts it
		 * under the given parent ID. This method is used to add new keys into an
		 * existing parent object, generally used for function call.
		 * Assumes that the key doesn't exist yet in the zobject table.
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {string} payload.key
		 * @param {Object} payload.value
		 */
		injectKeyValueFromRowId: function ( payload ) {
			const value = { [ payload.key ]: payload.value };
			const parentRow = this.getRowById( payload.rowId );
			const nextRowId = this.getNextRowId;
			const rows = convertJsonToTable( value, parentRow, nextRowId, false, 0, false );

			rows.forEach( ( row ) => {
				this.pushRow( row );
			} );
		},

		/**
		 * Pushes a list of values into an existing list parent rowId
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId list rowId
		 * @param {Array} payload.values array of values to insert into the array
		 */
		pushValuesToList: function ( payload ) {
			const parentRow = this.getRowById( payload.rowId );
			// rowId is not valid
			if ( !parentRow || parentRow.value !== Constants.ROW_VALUE_ARRAY ) {
				return;
			}

			let nextRowId = this.getNextRowId;
			for ( const value of payload.values ) {
				const nextIndex = this.getNextArrayIndex( parentRow.id );
				const rows = convertJsonToTable( value, parentRow, nextRowId, true, nextIndex );
				// Discard parentRow
				rows.shift();
				// Push all the object rows
				rows.forEach( ( row ) => this.pushRow( row ) );
				// Calculate nextRowId
				const lastRow = rows[ rows.length - 1 ];
				nextRowId = lastRow.id + 1;
			}
		},

		/**
		 * Removes an item from a ZTypedList
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId row ID of the item to delete
		 */
		removeItemFromTypedList: function ( payload ) {
			const row = this.getRowById( payload.rowId );
			if ( !row ) {
				return;
			}
			const parentRowId = row.parent;
			// remove item
			this.removeRowChildren( { rowId: payload.rowId, removeParent: true } );
			// renumber children of parent starting from key
			this.recalculateTypedListKeys( parentRowId );
		},

		/**
		 * Removes all items from a ZTypedList
		 * This should never be called directly, but is used before submitting a zobject
		 * in which a typed list has changed type, rendering the items invalid
		 *
		 * @param {Object} payload
		 * @param {number} payload.parentRowId
		 * @param {Array} payload.listItems
		 */
		removeItemsFromTypedList: function ( payload ) {
			for ( const itemRowId of payload.listItems ) {
				this.removeRowChildren( { rowId: itemRowId, removeParent: true } );
			}
			this.recalculateTypedListKeys( payload.parentRowId );
		},

		/**
		 * Moves an item in a typed list to the given position
		 *
		 * @param {Object} payload
		 * @param {number} payload.parentRowId
		 * @param {string} payload.key
		 * @param {number} payload.offset
		 */
		moveItemInTypedList: function ( payload ) {
			const items = this.getChildrenByParentRowId( payload.parentRowId );

			const movedItem = items.find( ( row ) => row.key === payload.key );
			const newKey = String( parseInt( payload.key ) + payload.offset );
			const displacedItem = items.find( ( row ) => row.key === newKey );

			this.setKeyByRowIndex( {
				index: this.getRowIndexById( movedItem.id ),
				key: newKey
			} );
			this.setKeyByRowIndex( {
				index: this.getRowIndexById( displacedItem.id ),
				key: payload.key
			} );
		}
	}
};

module.exports = {
	state: Object.assign(
		currentPageStore.state,
		factoryStore.state,
		submissionStore.state,
		zobjectStore.state
	),
	getters: Object.assign(
		currentPageStore.getters,
		factoryStore.getters,
		submissionStore.getters,
		zobjectStore.getters
	),
	actions: Object.assign(
		currentPageStore.actions,
		factoryStore.actions,
		submissionStore.actions,
		zobjectStore.actions
	)
};
