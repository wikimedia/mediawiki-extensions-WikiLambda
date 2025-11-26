<!--
	WikiLambda Vue component for the Function Metadata Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-dialog
		class="ext-wikilambda-app-function-metadata-dialog"
		:title="i18n( 'wikilambda-functioncall-metadata-accessible-title' ).text()"
		:open="open"
		@update:open="closeDialog"
	>
		<!-- Dialog Header -->
		<template #header>
			<wl-custom-dialog-header @close-dialog="closeDialog">
				<template #title>
					{{ i18n( 'wikilambda-function-evaluator-result-details' ).text() }}
				</template>
				<template v-if="headerText" #subtitle>
					<span :lang="headerText.langCode" :dir="headerText.langDir">
						{{ headerText.label }}
					</span>
				</template>
				<template #extra>
					<div class="ext-wikilambda-app-function-metadata-dialog__helplink">
						<cdx-icon :icon="iconHelpNotice"></cdx-icon>
						<a
							:title="tooltipMetaDataHelpLink"
							:href="parsedMetaDataHelpLink"
							target="_blank">
							{{ i18n( 'wikilambda-helplink-button' ).text() }}
						</a>
					</div>
				</template>
			</wl-custom-dialog-header>
		</template>

		<!-- Dialog Body -->
		<div v-if="apiErrors.length > 0" class="ext-wikilambda-app-function-metadata-dialog__body">
			<cdx-message
				v-for="( error, index ) in apiErrors"
				:key="'dialog-error-' + index"
				class="ext-wikilambda-metadata-dialog-errors"
				:type="error.type"
			>
				<wl-safe-message :error="error"></wl-safe-message>
			</cdx-message>
		</div>
		<div v-else class="ext-wikilambda-app-function-metadata-dialog__body">
			<cdx-message v-if="hasMetadataErrors">
				<!-- eslint-disable-next-line vue/no-v-html -->
				<div v-html="i18n( 'wikilambda-functioncall-metadata-errors-debug-hint' ).parse()"></div>
			</cdx-message>
			<cdx-field
				v-if="hasNestedMetadata"
				class="ext-wikilambda-app-function-metadata-dialog__select-block">
				<cdx-select
					:selected="selectedMetadataPath"
					class="ext-wikilambda-app-function-metadata-dialog__select"
					:class="selectedMenuItemClass"
					:menu-items="functionMenuItems"
					@update:selected="setSelectedMetadata"
				></cdx-select>
				<template #label>
					{{ i18n( 'wikilambda-functioncall-metadata-select-label' ).text() }}
				</template>
			</cdx-field>

			<cdx-accordion
				v-for="( section, sectionIndex ) in sections"
				:key="sectionIndex"
				:open="section.open"
			>
				<template #title>
					{{ section.title }}
				</template>
				<template #description>
					<!-- Description can be string or LabelData -->
					<span
						v-if="isLabelData( section.description )"
						:lang="section.description.langCode"
						:dir="section.description.langDir"
					>{{ section.description.labelOrUntitled }}</span>
					<span v-else>{{ section.description }}</span>
				</template>
				<ul class="ext-wikilambda-app-function-metadata-dialog__content">
					<wl-function-metadata-item
						v-for="( item, itemIndex ) in section.content"
						:key="`item-${ itemIndex }`"
						:key-string="`item-${ itemIndex }`"
						:item="item"
					></wl-function-metadata-item>
				</ul>
			</cdx-accordion>
		</div>
	</cdx-dialog>
</template>

<script>
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const { metadataKeys } = require( '../../../utils/metadataUtils.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );
const { extractErrorData, escapeHtml } = require( '../../../utils/errorUtils.js' );
const { extractZIDs } = require( '../../../utils/schemata.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );
const icons = require( '../../../../lib/icons.json' );
const DateFormatter = require( 'mediawiki.DateFormatter' );

// Widget components
const FunctionMetadataItem = require( './FunctionMetadataItem.vue' );
// Base components
const CustomDialogHeader = require( '../../base/CustomDialogHeader.vue' );
const SafeMessage = require( '../../base/SafeMessage.vue' );
// Codex components
const {
	CdxAccordion,
	CdxDialog,
	CdxField,
	CdxIcon,
	CdxMessage,
	CdxSelect
} = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-metadata-dialog',
	components: {
		'cdx-accordion': CdxAccordion,
		'cdx-dialog': CdxDialog,
		'cdx-field': CdxField,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'wl-custom-dialog-header': CustomDialogHeader,
		'wl-function-metadata-item': FunctionMetadataItem,
		'wl-safe-message': SafeMessage
	},
	props: {
		open: {
			type: Boolean,
			required: true,
			default: false
		},
		headerText: {
			type: LabelData,
			required: false,
			default: undefined
		},
		metadata: {
			type: Object,
			required: false,
			default: undefined
		},
		errorId: {
			type: String,
			required: false,
			default: undefined
		}
	},
	emits: [ 'close-dialog' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const iconHelpNotice = icons.cdxIconHelpNotice;
		const selectedMetadataPath = ref( '0' );

		/**
		 * Returns all api errors saved in the store by the errorId passed
		 * as a property. If none or errorId is undefined, returns emtpy array.
		 *
		 * @return {Array}
		 */
		const apiErrors = computed( () => ( props.errorId !== undefined ? store.getErrors( props.errorId ) : [] ) );

		/**
		 * Returns the available keys present in the given metadata object
		 *
		 * @param {Object} metadata
		 * @return {Map|undefined}
		 */
		function getKeyValues( metadata ) {
			// TODO (T368531) Checking typeof metadata as a safeguard;
			// metadata should always be an object.
			if ( !metadata || ( typeof metadata !== 'object' ) ) {
				return undefined;
			}

			const benjamin = metadata[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
			// TODO (T368531) Checking benjamin as a safeguard;
			// benjamin should always exist and be a list.
			if ( !benjamin || !Array.isArray( benjamin ) ) {
				return undefined;
			}

			const items = benjamin.slice( 1 );
			return new Map( items.map( ( pair ) => [
				pair[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ],
				pair[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ]
			] ) );
		}

		/**
		 * Returns whether the root level metadata object has
		 * nested metadata children.
		 *
		 * @return {boolean}
		 */
		const hasNestedMetadata = computed( () => {
			const metadataKeyValues = getKeyValues( props.metadata );
			return metadataKeyValues ? metadataKeyValues.has( 'nestedMetadata' ) : false;
		} );

		/**
		 * Returns the metadata collection for the selected function
		 * call metadata Id.
		 *
		 * @param {Object} metadata
		 * @param {string} selectedPath
		 * @param {number} index
		 * @param {Array} path
		 * @return {Object|undefined}
		 */
		function findMetadata( metadata, selectedPath, index = 0, path = [] ) {
			const metadataKeyValues = getKeyValues( metadata );
			// TODO (T368531) Checking keyValues as a safeguard;
			// 1. keyValues should always exist
			// 2. keyValues should not only contain a zObjectKey and no other metadata (T369625)
			if ( !metadataKeyValues || metadataKeyValues.size === 1 && metadataKeyValues.has( 'zObjectKey' ) ) {
				return undefined;
			}

			let nestedMetadata = metadataKeyValues.get( 'nestedMetadata' );

			path.push( index );
			const uniqueId = path.join( '-' );

			if ( uniqueId === selectedPath ) {
				return metadata;
			}

			if ( nestedMetadata ) {
				nestedMetadata = nestedMetadata.slice( 1 );
				for ( const i in nestedMetadata ) {
					const child = nestedMetadata[ i ];
					const found = findMetadata( child, selectedPath, i, path.slice() );
					if ( found ) {
						return found;
					}
				}
			}

			return undefined;
		}

		/**
		 * Returns the selected metadata collection given the
		 * currently selected function Call Id that identifies it.
		 * If no collection matches the Id, the parent metadata object
		 * is returned.
		 *
		 * @return {Object}
		 */
		const selectedMetadata = computed( () => {
			let selected;
			if ( hasNestedMetadata.value ) {
				selected = findMetadata( props.metadata, selectedMetadataPath.value );
			}
			return selected || props.metadata;
		} );

		/**
		 * Returns the help link from the Metadata dialog
		 *
		 * @return {string}
		 */
		const tooltipMetaDataHelpLink = computed( () => i18n( 'wikilambda-helplink-tooltip' ).text() );

		/**
		 * Returns the parsed help link from the Metadata dialog
		 *
		 * @return {string}
		 */
		const parsedMetaDataHelpLink = computed( () => {
			const unformattedLink = i18n( 'wikilambda-metadata-help-link' ).text();
			return mw.internalWikiUrlencode( unformattedLink );
		} );

		/**
		 * Returns the available keys present in the metadata object
		 *
		 * @return {Map|undefined}
		 */
		const keyValues = computed( () => getKeyValues( selectedMetadata.value ) );

		/**
		 * Returns if there are explicit errors in the metadata
		 *
		 * @param {Map} kv The keyValues map to check
		 * @return {boolean}
		 */
		function hasExplicitErrors( kv ) {
			return !!kv.get( 'errors' );
		}

		/**
		 * Returns if there's a test failure (expected vs actual results differ)
		 *
		 * @param {Map} kv The keyValues map to check
		 * @return {boolean}
		 */
		function hasTestFailure( kv ) {
			const expectedResult = kv.get( 'expectedTestResult' );
			const actualResult = kv.get( 'actualTestResult' );

			if ( expectedResult && actualResult ) {
				const expectedValue = getStringValue( expectedResult );
				const actualValue = getStringValue( actualResult );
				return expectedValue !== actualValue;
			}

			return false;
		}

		/**
		 * Transform method.
		 * Given a mixed type value returns a string
		 * either by returning its Z6K1, or strigifying it
		 *
		 * @param {Mixed} value
		 * @return {string}
		 */
		function getStringValue( value ) {
			if ( typeof value === 'string' ) {
				return value;
			}
			if ( ( typeof value === 'object' ) && ( value[ Constants.Z_STRING_VALUE ] ) ) {
				return value[ Constants.Z_STRING_VALUE ];
			}
			return JSON.stringify( value );
		}

		/**
		 * Transform method.
		 * Given an array of logs, return a renderable list.
		 *
		 * @param {Array} logs
		 * @return {string}
		 */
		function getDebugLogs( logs ) {
			if ( typeof logs === 'string' ) {
				return {
					type: Constants.METADATA_CONTENT_TYPE.TEXT,
					value: logs
				};
			}
			if ( Array.isArray( logs ) ) {
				const list = [];
				for ( const log of logs.slice( 1 ) ) {
					// TODO (T385176) Enable representation of non-string values
					const safeLog = escapeHtml( getStringValue( log ) );
					list.push( `<li>${ safeLog }</li>` );
					getStringValue( log );
				}
				return {
					type: Constants.METADATA_CONTENT_TYPE.HTML,
					value: `<ul>${ list.join( '' ) }</ul>`
				};
			}
			return undefined;
		}

		/**
		 * Returns the array of menu items to feed the CdxSelect
		 * component. Each menu item identifies the metadata collection
		 * for a particular function call. The value that identifies
		 * the function call metadata Ids is created with the
		 * functionCall string and the orchestration start time, to
		 * distinguish between two function calls with the same name
		 * and arguments.
		 *
		 * @param {Object} metadata
		 * @param {number} depth
		 * @param {number} index
		 * @param {Array} path
		 * @return {Array}
		 */
		function generateFunctionMenuItems( metadata, depth = 1, index = 0, path = [] ) {
			const metadataKeyValues = getKeyValues( metadata );
			// TODO (T368531) Checking keyValues as a safeguard;
			// 1. keyValues should always exist.
			// 2. keyValues should not only contain a zObjectKey and no other metadata (T369625)
			if ( !metadataKeyValues || metadataKeyValues.size === 1 && metadataKeyValues.has( 'zObjectKey' ) ) {
				return [];
			}

			let functionCall = metadataKeyValues.get( 'zObjectKey' );
			let labelizedFunctionCall = i18n( 'wikilambda-editor-default-name' ).text();

			// If zObjectKey is not present, extract function Zid from implementationId
			if ( !functionCall ) {
				let implementationId = metadataKeyValues.get( 'implementationId' );
				implementationId = getStringValue( implementationId );
				functionCall = store.getFunctionZidOfImplementation( implementationId );
			}

			// If functionCall has any values, transform into human-readable labels
			if ( functionCall ) {
				const zids = extractZIDs( functionCall, true );
				labelizedFunctionCall = addSpacing( functionCall );
				zids.forEach( ( zid ) => {
					labelizedFunctionCall = labelizedFunctionCall.split( zid ).join( store.getLabelData( zid ).label );
				} );
			}

			path.push( index );
			const uniqueId = path.join( '-' );

			const nestedMetadata = metadataKeyValues.get( 'nestedMetadata' );
			const hasErrors = hasExplicitErrors( metadataKeyValues ) || hasTestFailure( metadataKeyValues );
			const state = !hasErrors ? 'pass' : 'fail';

			const menuItems = [ {
				label: labelizedFunctionCall,
				value: uniqueId,
				style: `--menuItemLevel: ${ depth };`,
				class: 'ext-wikilambda-app-function-metadata-dialog__menu-item ' +
					`ext-wikilambda-app-function-metadata-dialog__menu-item--${ state }`,
				icon: !hasErrors ? icons.cdxIconSuccess : icons.cdxIconError,
				state
			} ];

			// Recursively create child menu items
			if ( nestedMetadata ) {
				nestedMetadata.slice( 1 ).forEach( ( child, i ) => {
					const childMenuItems = generateFunctionMenuItems( child, depth + 1, i, path.slice() );
					menuItems.push( ...childMenuItems );
				} );
			}

			return menuItems;
		}

		/**
		 * Adds spacing to function call strings for better readability
		 *
		 * @param {string} functionCall
		 * @return {string}
		 */
		function addSpacing( functionCall ) {
			let spaced = functionCall.split( '(' ).join( ' (' );
			spaced = spaced.split( ',' ).join( ', ' );
			return spaced;
		}

		/**
		 * @return {Array}
		 */
		const sections = computed( () => {
			if ( !keyValues.value ) {
				return [];
			}
			return compileSections( metadataKeys );
		} );

		/**
		 * Returns the parent-level menuItems array for the dialog selector.
		 *
		 * @return {Array}
		 */
		const functionMenuItems = computed( () => ( hasNestedMetadata.value ?
			generateFunctionMenuItems( props.metadata ) : [] ) );

		/**
		 * Returns the class of the selected menuItem,
		 * to identify its passing/failing state.
		 *
		 * @return {string}
		 */
		const selectedMenuItemClass = computed( () => {
			const selectedMenuItem = functionMenuItems.value
				.find( ( menuItem ) => menuItem.value === selectedMetadataPath.value );
			return selectedMenuItem ?
				`ext-wikilambda-app-function-metadata-dialog__selected--${ selectedMenuItem.state }` :
				'';
		} );

		/**
		 * Returns if there are any errors in the metadata
		 *
		 * @return {boolean}
		 */
		const hasMetadataErrors = computed( () => hasExplicitErrors( keyValues.value ) ||
			hasTestFailure( keyValues.value ) );

		/**
		 * Returns the URL for a given ZID
		 *
		 * @param {string} zid
		 * @return {string}
		 */
		function getUrl( zid ) {
			return urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid } );
		}

		/**
		 * Checks if a string is a valid ZID format
		 *
		 * @param {string} zid
		 * @return {boolean}
		 */
		function isValidZidFormat( zid ) {
			return /^Z\d+$/.test( zid );
		}

		/**
		 * Returns the error section summary, which consists on the labelized
		 * error type, followed by the string arguments (if any) in parenthesis:
		 * <Error type label> (<1st arg label>: "<value>", ..., <nth arg label>: "<value>")
		 *
		 * E.g. 'Bad input format (expected format: "dd/m/yyyy", current value: "boo")'
		 *
		 * @return {LabelData|string}
		 */
		function getErrorSummary() {
			// Check for explicit errors first
			if ( hasExplicitErrors( keyValues.value ) ) {
				return getExplicitErrorSummary();
			}

			// Check for test failure
			if ( hasTestFailure( keyValues.value ) ) {
				return i18n( 'wikilambda-functioncall-metadata-test-failure' ).text();
			}

			// Return None if there are no errors
			return i18n( 'wikilambda-functioncall-metadata-errors-none' ).text();
		}

		/**
		 * Returns the explicit error section summary
		 *
		 * @return {string}
		 */
		function getExplicitErrorSummary() {
			const error = keyValues.value.get( 'errors' );
			const errorData = extractErrorData( error );
			const colon = i18n( 'colon-separator' ).text();
			const comma = i18n( 'comma-separator' ).text();

			if ( !errorData ) {
				return '';
			}
			// Return labelized parent error type
			const title = store.getLabelData( errorData.errorType ).label;
			const args = [];
			for ( const arg of errorData.stringArgs ) {
				const key = store.getLabelData( arg.key ).label;
				const value = i18n( 'quotation-marks', escapeHtml( arg.value ) ).text();
				args.push( `${ key }${ colon }${ value }` );
			}
			const argblock = i18n( 'parentheses', args.join( comma ) ).text();
			return `${ title } ${ argblock }`;
		}

		/**
		 * Returns the implementation section summary
		 *
		 * @return {LabelData|string}
		 */
		function getImplementationSummary() {
			const implementationId = keyValues.value.get( 'implementationId' );
			const zid = getStringValue( implementationId );
			return isValidZidFormat( zid ) ? store.getLabelData( zid ) : '';
		}

		/**
		 * Returns the duration section summary
		 *
		 * @return {string}
		 */
		function getDurationSummary() {
			return keyValues.value.get( 'orchestrationDuration' );
		}

		/**
		 * Returns the CPU usage section summary
		 *
		 * @return {string}
		 */
		function getCpuUsageSummary() {
			return sumValuesWithUnit( [
				keyValues.value.get( 'orchestrationCpuUsage' ),
				keyValues.value.get( 'evaluationCpuUsage' )
			], 'ms' );
		}

		/**
		 * Returns the memory usage section summary
		 *
		 * @return {string}
		 */
		function getMemoryUsageSummary() {
			return sumValuesWithUnit( [
				keyValues.value.get( 'orchestrationMemoryUsage' ),
				keyValues.value.get( 'evaluationMemoryUsage' ),
				keyValues.value.get( 'executionMemoryUsage' )
			], 'MiB' );
		}

		/**
		 * Helper function to sum an array of values which
		 * are stringified numbers followed by their unit
		 *
		 * @param {Array} values
		 * @param {string} unit
		 * @return {string}
		 */
		function sumValuesWithUnit( values, unit ) {
			let total = 0;
			for ( let value of values ) {
				try {
					value = parseFloat( value.split( ' ' )[ 0 ] );
				} catch ( e ) {
					value = 0;
				}
				total += value;
			}
			return `${ total.toPrecision( 4 ) } ${ unit }`;
		}

		/**
		 * Transform method.
		 * Returns the linked label of the root error from the given
		 * key ('errors' or 'validateErrors'). Returns an object with
		 * the properties value and url, for the template to render a link.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		function getErrorType( value ) {
			const data = extractErrorData( value );
			if ( data ) {
				const errorType = data.errorType;
				const errorLabelData = store.getLabelData( errorType );
				return {
					type: Constants.METADATA_CONTENT_TYPE.LINK,
					value: errorLabelData.label,
					lang: errorLabelData.langCode,
					dir: errorLabelData.langDir,
					url: getUrl( errorType )
				};
			}
			return undefined;
		}

		/**
		 * Transform method.
		 * Returns a safe HTML fragment with the content for the error
		 * string arguments. If there are any, the returned html will
		 * contain an unnumbered list, where each item contains the
		 * labelized key, followed by the value.
		 * If there are no string arguments to list, returns undefined.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		function getErrorStringArgs( value ) {
			const data = extractErrorData( value );
			if ( data && data.stringArgs && data.stringArgs.length ) {
				const list = [];
				const colon = i18n( 'colon-separator' ).text();
				for ( const arg of data.stringArgs ) {
					const key = store.getLabelData( arg.key );
					// SECURITY: Escape any HTML in the argument label
					const escapedLabel = escapeHtml( key.labelOrUntitled );
					const keySpan = `<span dir="${ key.langDir }" lang="${ key.langCode }">${ escapedLabel }</span>`;
					// SECURITY: Escape any HTML in the argument value
					const escapedArg = escapeHtml( arg.value );
					const quotedArg = i18n( 'quotation-marks', escapedArg ).text();
					list.push( `<li>${ keySpan }${ colon }${ quotedArg }</li>` );
				}
				return {
					type: Constants.METADATA_CONTENT_TYPE.HTML,
					value: `<ul>${ list.join( '' ) }</ul>`
				};
			}
			return undefined;
		}

		/**
		 * Transform method.
		 * Returns a safe HTML fragment with the content for the sub-errors.
		 * If there are any, the returned html will contain an unnumbered
		 * list, where each item contains the labelized sub-error type.
		 * If there are no sub-errors to list, returns undefined.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		function getErrorChildren( value ) {
			const data = extractErrorData( value );
			if ( data && data.children && data.children.length ) {
				const children = [];
				for ( const child of data.children ) {
					const url = getUrl( child.errorType );
					const e = store.getLabelData( child.errorType );
					// SECURITY: Escape any HTML in the error type label
					const escapedLabel = escapeHtml( e.label );
					const a = `<a href="${ url }" dir="${ e.langDir }" lang="${ e.langCode }">${ escapedLabel }</a>`;
					children.push( `<li>${ a }</li>` );
				}
				return {
					type: Constants.METADATA_CONTENT_TYPE.HTML,
					value: `<ul>${ children.join( '' ) }</ul>`
				};
			}
			return undefined;
		}

		/**
		 * Transform method.
		 * Given the value of implementationId, returns the name of that
		 * implementation Id and its Url.
		 * If the implementationId is invalid, returns undefined.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		function getImplementationLink( value ) {
			const zid = getStringValue( value );
			if ( isValidZidFormat( zid ) ) {
				const labelData = store.getLabelData( zid );
				return {
					type: Constants.METADATA_CONTENT_TYPE.LINK,
					value: labelData.labelOrUntitled,
					lang: labelData.langCode,
					dir: labelData.langDir,
					url: getUrl( zid )
				};
			}
			return undefined;
		}

		/**
		 * Transform method.
		 * Attempts to render a relative timestamp given a
		 * datetime string in ISO 8601 format
		 *
		 * @param {string} input
		 * @return {Object}
		 */
		function toRelativeTime( input ) {
			const date = new Date( input );
			const isValidDate = !Number.isNaN( date.getTime() );
			const value = isValidDate ?
				DateFormatter.formatRelativeTimeOrDate( date ) :
				input;

			return {
				type: Constants.METADATA_CONTENT_TYPE.TEXT,
				value
			};
		}

		/**
		 * Returns the compiled metadata sections. Each item in the
		 * array contains the following properties:
		 * * title: the section title
		 * * description (optional): the method name that returns the description
		 * * sections (optional): the array of subsections, or
		 * * keys (optional): the array of terminal keys
		 *
		 * @param {Array} sectionsConfig
		 * @return {Array}
		 */
		function compileSections( sectionsConfig ) {
			const metadata = [];
			for ( const key in sectionsConfig ) {
				const value = sectionsConfig[ key ];
				// Build section
				const section = {
					// possible message keys:
					// * wikilambda-functioncall-metadata-errors
					// * wikilambda-functioncall-metadata-implementation
					// * wikilambda-functioncall-metadata-duration
					// * wikilambda-functioncall-metadata-orchestration
					// * wikilambda-functioncall-metadata-evaluation
					// * wikilambda-functioncall-metadata-cpu-usage
					// * wikilambda-functioncall-metadata-memory-usage
					// * wikilambda-functioncall-metadata-hostname
					// * wikilambda-functioncall-metadata-programming-langua
					title: i18n( value.title ).text(),
					content: ( 'sections' in value ) ?
						compileSections( value.sections ) :
						compileKeys( value.keys ),
					open: value.open || false
				};
				// Check that section has content
				if ( section.content.length > 0 ) {
					// Compute description if needed and description function is available
					if ( ( 'description' in value ) ) {
						const descMethod = value.description;
						if ( descMethod === 'getErrorSummary' ) {
							section.description = getErrorSummary();
						} else if ( descMethod === 'getImplementationSummary' ) {
							section.description = getImplementationSummary();
						} else if ( descMethod === 'getDurationSummary' ) {
							section.description = getDurationSummary();
						} else if ( descMethod === 'getCpuUsageSummary' ) {
							section.description = getCpuUsageSummary();
						} else if ( descMethod === 'getMemoryUsageSummary' ) {
							section.description = getMemoryUsageSummary();
						}
					}
					metadata.push( section );
				}
			}
			return metadata;
		}

		/**
		 * Returns the compiled terminal key-values for the metadata sections
		 * given an array of key specifications. Each item in the array contains
		 * the following properties:
		 * * title: the key title,
		 * * key: mapping to the key identifier from the metadata array
		 * * transform (optional): method name to transform the value
		 *
		 * @param {Array} keys
		 * @return {Array}
		 */
		function compileKeys( keys ) {
			const metadata = [];
			for ( const value of keys ) {
				if ( keyValues.value.has( value.key ) ) {
					const item = {
						// possible message keys:
						// * wikilambda-functioncall-metadata-errors-summary
						// * wikilambda-functioncall-metadata-validator-errors-summary
						// * wikilambda-functioncall-metadata-expected-result
						// * wikilambda-functioncall-metadata-actual-result
						// * wikilambda-functioncall-metadata-execution-debug-logs
						// * wikilambda-functioncall-metadata-implementation-name
						// * wikilambda-functioncall-metadata-implementation-id
						// * wikilambda-functioncall-metadata-implementation-type
						// * wikilambda-functioncall-metadata-duration
						// * wikilambda-functioncall-metadata-start-time
						// * wikilambda-functioncall-metadata-end-time
						// * wikilambda-functioncall-metadata-orchestration
						// * wikilambda-functioncall-metadata-evaluation
						// * wikilambda-functioncall-metadata-execution
						// * wikilambda-functioncall-metadata-programming-language-version
						title: i18n( value.title ).text(),
						data: getTransformedValue( value )
					};

					// If the data is available, add to metadata
					if ( item.data ) {
						metadata.push( item );
					}
				}
			}
			return metadata;
		}

		const transforms = {
			getErrorType,
			getErrorStringArgs,
			getErrorChildren,
			getImplementationLink,
			getStringValue,
			toRelativeTime,
			getDebugLogs
		};

		/**
		 * Transforms metadata values based on the transform method specified
		 *
		 * @param {Object} item
		 * @return {Object|undefined}
		 */
		function getTransformedValue( item ) {
			let value = keyValues.value.get( item.key );

			if ( item.transform && transforms[ item.transform ] ) {
				value = transforms[ item.transform ]( value );
			}

			if ( !value ) {
				return undefined;
			}

			// Wrap in text object if value is still a string
			return ( typeof value === 'string' ) ?
				{ type: Constants.METADATA_CONTENT_TYPE.TEXT, value } :
				value;
		}

		/**
		 * Sets the selected metadata path
		 *
		 * @param {string} value
		 */
		function setSelectedMetadata( value ) {
			selectedMetadataPath.value = value;
		}

		/**
		 * Closes the dialog
		 */
		function closeDialog() {
			selectedMetadataPath.value = '0';
			emit( 'close-dialog' );
		}

		/**
		 * Checks if the payload is an instance of LabelData
		 *
		 * @param {*} payload
		 * @return {boolean}
		 */
		function isLabelData( payload ) {
			return ( payload instanceof LabelData );
		}

		return {
			apiErrors,
			closeDialog,
			functionMenuItems,
			hasMetadataErrors,
			hasNestedMetadata,
			iconHelpNotice,
			isLabelData,
			parsedMetaDataHelpLink,
			sections,
			selectedMetadataPath,
			selectedMenuItemClass,
			setSelectedMetadata,
			tooltipMetaDataHelpLink,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-metadata-dialog {
	.ext-wikilambda-app-function-metadata-dialog__helplink {
		display: flex;
		align-items: center;
		gap: @spacing-25;
	}

	.ext-wikilambda-app-function-metadata-dialog__body {
		color: @color-base;
	}

	.ext-wikilambda-app-function-metadata-dialog__select-block {
		padding-bottom: @spacing-100;
	}

	.ext-wikilambda-app-function-metadata-dialog__select {
		width: 100%;
	}

	.ext-wikilambda-app-function-metadata-dialog__selected {
		&--pass {
			.cdx-icon {
				color: @color-success;
			}
		}

		&--fail {
			.cdx-icon {
				color: @color-destructive;
			}
		}
	}

	.ext-wikilambda-app-function-metadata-dialog__menu-item {
		--spacing-75: @spacing-75;
		padding-left: ~'calc( var(--spacing-75) * var(--menuItemLevel) )';

		&--pass {
			.cdx-icon {
				color: @color-success;
			}
		}

		&--fail {
			.cdx-icon {
				color: @color-destructive;
			}
		}
	}
}
</style>
