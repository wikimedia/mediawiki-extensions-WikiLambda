<!--
	WikiLambda Vue component for the Function Metadata Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-dialog
		class="ext-wikilambda-app-function-metadata-dialog"
		:title="$i18n( 'wikilambda-functioncall-metadata-accessible-title' ).text()"
		:open="open"
		@update:open="closeDialog"
	>
		<!-- Dialog Header -->
		<template #header>
			<wl-custom-dialog-header @close-dialog="closeDialog">
				<template #title>
					{{ $i18n( 'wikilambda-function-evaluator-result-details' ).text() }}
				</template>
				<template v-if="headerText" #subtitle>
					<span :lang="headerText.langCode" :dir="headerText.langDir">
						{{ headerText.label }}
					</span>
				</template>
				<template #extra>
					<div class="ext-wikilambda-app-function-metadata-dialog__helplink">
						<cdx-icon :icon="icons.cdxIconHelpNotice"></cdx-icon>
						<a
							:title="tooltipMetaDataHelpLink"
							:href="parsedMetaDataHelpLink"
							target="_blank">
							{{ $i18n( 'wikilambda-helplink-button' ).text() }}
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
				<!-- eslint-disable vue/no-v-html -->
				<div v-html="getErrorMessage( error )"></div>
			</cdx-message>
		</div>
		<div v-else class="ext-wikilambda-app-function-metadata-dialog__body">
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
					{{ $i18n( 'wikilambda-functioncall-metadata-select-label' ).text() }}
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
					<li
						v-for="( item, itemIndex ) in section.content"
						:key="'item' + itemIndex"
						class="ext-wikilambda-app-function-metadata-dialog__key"
					>
						<span class="ext-wikilambda-app-function-metadata-dialog__key-title">{{ item.title }}</span>:
						<template v-if="item.value">
							<a
								v-if="item.url"
								:href="item.url"
								:lang="item.lang"
								:dir="item.dir"
								target="_blank"
							>{{ item.value }}</a>
							<span
								v-else
								:lang="item.lang"
								:dir="item.dir"
							>{{ item.value }}</span>
						</template>
						<ul v-if="item.content">
							<li
								v-for="( subitem, subindex ) in item.content"
								:key="'subitem' + subindex"
								class="ext-wikilambda-app-function-metadata-dialog__subkey"
							>
								{{ subitem.title }}: {{ subitem.value }}
							</li>
						</ul>
					</li>
				</ul>
			</cdx-accordion>
		</div>
	</cdx-dialog>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );
const { CdxAccordion, CdxDialog, CdxField, CdxIcon, CdxMessage, CdxSelect } = require( '../../../../codex.js' );
const Constants = require( '../../../Constants.js' );
const CustomDialogHeader = require( '../../base/CustomDialogHeader.vue' );
const errorUtils = require( '../../../mixins/errorUtils.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const metadataConfig = require( '../../../mixins/metadata.js' );
const useMainStore = require( '../../../store/index.js' );
const { extractErrorStructure, extractZIDs } = require( '../../../mixins/schemata.js' ).methods;
const typeUtils = require( '../../../mixins/typeUtils.js' );
const icons = require( '../../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-function-metadata-dialog',
	components: {
		'cdx-accordion': CdxAccordion,
		'cdx-dialog': CdxDialog,
		'cdx-field': CdxField,
		'cdx-icon': CdxIcon,
		'cdx-message': CdxMessage,
		'cdx-select': CdxSelect,
		'wl-custom-dialog-header': CustomDialogHeader
	},
	mixins: [ typeUtils, metadataConfig, errorUtils ],
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
			type: Number,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			icons: icons,
			selectedMetadataPath: '0'
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getErrors',
		'getLabelData',
		'getUserLangCode',
		'getFunctionZidOfImplementation'
	] ), {
		/**
		 * Returns all api errors saved in the store by the errorId passed
		 * as a property. If none or errorId is undefined, returns emtpy array.
		 *
		 * @return {Array}
		 */
		apiErrors: function () {
			return this.errorId !== undefined ? this.getErrors( this.errorId ) : [];
		},
		/**
		 * Returns whether the root level metadata object has
		 * nested metadata children.
		 *
		 * @return {boolean}
		 */
		hasNestedMetadata: function () {
			const keyValues = this.getKeyValues( this.metadata );
			return keyValues ? keyValues.has( 'nestedMetadata' ) : false;
		},
		/**
		 * Returns the selected metadata collection given the
		 * currently selected function Call Id that identifies it.
		 * If no collection matches the Id, the parent metadata object
		 * is returned.
		 *
		 * @return {Object}
		 */
		selectedMetadata: function () {
			let selectedMetadata;
			if ( this.hasNestedMetadata ) {
				selectedMetadata = this.findMetadata( this.metadata, this.selectedMetadataPath );
			}
			return selectedMetadata || this.metadata;
		},
		/**
		 * Returns the help link from the Metadata dialog
		 *
		 * @return {string}
		 */
		tooltipMetaDataHelpLink: function () {
			return this.$i18n( 'wikilambda-helplink-tooltip' ).text();
		},
		/**
		 * Returns the parsed help link from the Metadata dialog
		 *
		 * @return {string}
		 */
		parsedMetaDataHelpLink: function () {
			const unformattedLink = this.$i18n( 'wikilambda-metadata-help-link' ).text();
			return mw.internalWikiUrlencode( unformattedLink );
		},
		/**
		 * Returns the available keys present in the metadata object
		 *
		 * @return {Map|undefined}
		 */
		keyValues: function () {
			return this.getKeyValues( this.selectedMetadata );
		},
		/**
		 * @return {Array}
		 */
		sections: function () {
			if ( !this.keyValues ) {
				return [];
			}
			return this.compileSections( this.metadataKeys );
		},
		/**
		 * Returns the parent-level menuItems array for the dialog selector.
		 *
		 * @return {Array}
		 */
		functionMenuItems: function () {
			return this.hasNestedMetadata ? this.generateFunctionMenuItems( this.metadata ) : [];
		},
		/**
		 * Returns the class of the selected menuItem,
		 * to identify its passing/failing state.
		 *
		 * @return {string}
		 */
		selectedMenuItemClass: function () {
			const selectedMenuItem = this.functionMenuItems
				.find( ( menuItem ) => menuItem.value === this.selectedMetadataPath );
			return selectedMenuItem ?
				`ext-wikilambda-app-function-metadata-dialog__selected--${ selectedMenuItem.state }` :
				'';
		}
	} ),
	methods: {
		/**
		 * Returns the available keys present in the given metadata object
		 *
		 * @param {Object} metadata
		 * @return {Map|undefined}
		 */
		getKeyValues: function ( metadata ) {
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
		},
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
		generateFunctionMenuItems: function ( metadata, depth = 1, index = 0, path = [] ) {
			const keyValues = this.getKeyValues( metadata );
			// TODO (T368531) Checking keyValues as a safeguard;
			// 1. keyValues should always exist.
			// 2. keyValues should not only contain a zObjectKey and no other metadata (T369625)
			if ( !keyValues || keyValues.size === 1 && keyValues.has( 'zObjectKey' ) ) {
				return [];
			}

			let functionCall = keyValues.get( 'zObjectKey' );
			let labelizedFunctionCall = this.$i18n( 'wikilambda-editor-default-name' ).text();

			// If zObjectKey is not present, extract function Zid from implementationId
			if ( !functionCall ) {
				let implementationId = keyValues.get( 'implementationId' );
				implementationId = this.getStringValue( implementationId );
				functionCall = this.getFunctionZidOfImplementation( implementationId );
			}

			// If functionCall has any values, transform into human-readable labels
			if ( functionCall ) {
				const zids = extractZIDs( functionCall, true );
				labelizedFunctionCall = this.addSpacing( functionCall );
				zids.forEach( ( zid ) => {
					labelizedFunctionCall = labelizedFunctionCall.split( zid ).join( this.getLabelData( zid ).label );
				} );
			}

			path.push( index );
			const uniqueId = path.join( '-' );

			const errors = keyValues.get( 'errors' );
			const nestedMetadata = keyValues.get( 'nestedMetadata' );
			const state = !errors ? 'pass' : 'fail';

			const menuItems = [ {
				label: labelizedFunctionCall,
				value: uniqueId,
				style: `--menuItemLevel: ${ depth };`,
				class: 'ext-wikilambda-app-function-metadata-dialog__menu-item ' +
					`ext-wikilambda-app-function-metadata-dialog__menu-item--${ state }`,
				icon: !errors ? icons.cdxIconSuccess : icons.cdxIconError,
				state
			} ];

			// Recursively create child menu items
			if ( nestedMetadata ) {
				nestedMetadata.slice( 1 ).forEach( ( child, i ) => {
					const childMenuItems = this.generateFunctionMenuItems( child, depth + 1, i, path.slice() );
					menuItems.push( ...childMenuItems );
				} );
			}

			return menuItems;
		},
		/**
		 * Returns the metadata collection for the selected function
		 * call metadata Id.
		 *
		 * @param {Object} metadata
		 * @param {string} selectedMetadataPath
		 * @param {number} index
		 * @param {Array} path
		 * @return {Object|undefined}
		 */
		findMetadata: function ( metadata, selectedMetadataPath, index = 0, path = [] ) {
			const keyValues = this.getKeyValues( metadata );
			// TODO (T368531) Checking keyValues as a safeguard;
			// 1. keyValues should always exist
			// 2. keyValues should not only contain a zObjectKey and no other metadata (T369625)
			if ( !keyValues || keyValues.size === 1 && keyValues.has( 'zObjectKey' ) ) {
				return undefined;
			}

			let nestedMetadata = keyValues.get( 'nestedMetadata' );

			path.push( index );
			const uniqueId = path.join( '-' );

			if ( uniqueId === selectedMetadataPath ) {
				return metadata;
			}

			if ( nestedMetadata ) {
				nestedMetadata = nestedMetadata.slice( 1 );
				for ( const i in nestedMetadata ) {
					const child = nestedMetadata[ i ];
					const selectedMetadata = this.findMetadata( child, selectedMetadataPath, i, path.slice() );
					if ( selectedMetadata ) {
						return selectedMetadata;
					}
				}
			}

			return undefined;
		},
		/**
		 * Selects the given function call metadata Id
		 *
		 * @param {string} value
		 */
		setSelectedMetadata: function ( value ) {
			this.selectedMetadataPath = value;
		},
		/**
		 * Closes the dialog.
		 */
		closeDialog: function () {
			this.selectedMetadataPath = '0';
			this.$emit( 'close-dialog' );
		},
		/**
		 * Returns the compiled metadata sections. Each item in the
		 * array contains the following properties:
		 * * title: the section title
		 * * description (optional): the method name that returns the description
		 * * sections (optional): the array of subsections, or
		 * * keys (optional): the array of terminal keys
		 *
		 * @param {Array} sections
		 * @return {Array}
		 */
		compileSections: function ( sections ) {
			const metadata = [];
			for ( const key in sections ) {
				const value = sections[ key ];
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
					// * wikilambda-functioncall-metadata-programming-language
					title: this.$i18n( value.title ).text(),
					content: ( 'sections' in value ) ?
						this.compileSections( value.sections ) :
						this.compileKeys( value.keys ),
					open: value.open || false
				};
				// Check that section has content
				if ( section.content.length > 0 ) {
					// Compute description if needed and description function is available
					if ( ( 'description' in value ) && ( value.description in this ) ) {
						section.description = this[ value.description ]();
					}
					metadata.push( section );
				}
			}
			return metadata;
		},
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
		compileKeys: function ( keys ) {
			const metadata = [];
			for ( const value of keys ) {
				if ( this.keyValues.has( value.key ) ) {
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
						title: this.$i18n( value.title ).text(),
						value: this.keyValues.get( value.key )
					};
					// Apply transformation if needed and transform function is available
					if ( ( 'transform' in value ) && ( value.transform in this ) ) {
						const transformed = this[ value.transform ]( item.value );
						if ( !!transformed && typeof transformed === 'object' ) {
							// transformations can return an object with more values
							// E.g. { value: 'text', url: 'http://some.link' },
							// in such case, extend the item object.
							Object.assign( item, transformed );
						} else {
							item.value = transformed;
						}
					}
					// If the value is available, add to metadata
					if ( item.value ) {
						metadata.push( item );
					}
				}
			}
			return metadata;
		},
		/**
		 * Returns the error section summary
		 *
		 * @return {LabelData|string}
		 */
		getErrorSummary: function () {
			const error = this.keyValues.get( 'errors' );
			const suberrors = extractErrorStructure( error );
			// Return labelized parent error type
			if ( suberrors.length > 0 ) {
				const errorType = suberrors[ 0 ].errorType;
				return this.getLabelData( errorType );
			}
			// Return None if there are no errors
			return this.$i18n( 'wikilambda-functioncall-metadata-errors-none' ).text();
		},
		/**
		 * Returns the implementation section summary
		 *
		 * @return {LabelData|string}
		 */
		getImplementationSummary: function () {
			const implementationId = this.keyValues.get( 'implementationId' );
			const zid = this.getStringValue( implementationId );
			return this.isValidZidFormat( zid ) ? this.getLabelData( zid ) : '';
		},
		/**
		 * Returns the duration section summary
		 *
		 * @return {string}
		 */
		getDurationSummary: function () {
			return this.keyValues.get( 'orchestrationDuration' );
		},
		/**
		 * Returns the CPU usage section summary
		 *
		 * @return {string}
		 */
		getCpuUsageSummary: function () {
			return this.sumValuesWithUnit( [
				this.keyValues.get( 'orchestrationCpuUsage' ),
				this.keyValues.get( 'evaluationCpuUsage' )
			], 'ms' );
		},
		/**
		 * Returns the memory usage section summary
		 *
		 * @return {string}
		 */
		getMemoryUsageSummary: function () {
			return this.sumValuesWithUnit( [
				this.keyValues.get( 'orchestrationMemoryUsage' ),
				this.keyValues.get( 'evaluationMemoryUsage' ),
				this.keyValues.get( 'executionMemoryUsage' )
			], 'MiB' );
		},
		/**
		 * Helper function to sum an array of values which
		 * are stringified numbers followed by their unit
		 *
		 * @param {Array} values
		 * @param {string} unit
		 * @return {string}
		 */
		sumValuesWithUnit: function ( values, unit ) {
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
		},
		/**
		 * Returns the linked label of the root error from the given
		 * key ('errors' or 'validateErrors'). Returns an object with
		 * the properties value and url, for the template to render a link.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		getErrorType: function ( value ) {
			const suberrors = extractErrorStructure( value );
			if ( suberrors.length > 0 ) {
				const errorType = suberrors[ 0 ].errorType;
				const errorLabelData = this.getLabelData( errorType );
				return {
					value: errorLabelData.label,
					lang: errorLabelData.langCode,
					dir: errorLabelData.langDir,
					url: this.getUrl( errorType )
				};
			}
			return undefined;
		},
		/**
		 * Transform method that given a mixed type value returns
		 * a string, either by returning its Z6K1, or strigifying it
		 *
		 * @param {Mixed} value
		 * @return {string}
		 */
		getStringValue: function ( value ) {
			if ( typeof value === 'string' ) {
				return value;
			}
			if ( ( typeof value === 'object' ) && ( value[ Constants.Z_STRING_VALUE ] ) ) {
				return value[ Constants.Z_STRING_VALUE ];
			}
			return JSON.stringify( value );
		},
		/**
		 * Transform method that given the value of implementationId,
		 * returns the name of that implementation Id and its Url.
		 * If the implementationId is invalid, returns undefined.
		 *
		 * @param {Mixed} value
		 * @return {Object | undefined}
		 */
		getImplementationLink: function ( value ) {
			const zid = this.getStringValue( value );
			if ( this.isValidZidFormat( zid ) ) {
				const labelData = this.getLabelData( zid );
				return {
					value: labelData.labelOrUntitled,
					lang: labelData.langCode,
					dir: labelData.langDir,
					url: this.getUrl( zid )
				};
			}
			return undefined;
		},
		/**
		 * Returns the url for a given Zid
		 *
		 * @param {string} zid
		 * @return {string}
		 */
		getUrl: function ( zid ) {
			return '/view/' + this.getUserLangCode + '/' + zid;
		},
		/**
		 * Attempts to render a relative timestamp given a
		 * datetime string in ISO 8601 format
		 *
		 * @param {string} dateTimeString
		 * @return {string}
		 */
		toRelativeTime: function ( dateTimeString ) {
			if ( Intl.RelativeTimeFormat ) {
				const target = Date.parse( dateTimeString );
				const now = Date.now();
				const offset = now - target;

				let relativeTimeFormatter;
				try {
					relativeTimeFormatter = new Intl.RelativeTimeFormat( mw.config.get( 'wgUserLanguage' ) );
				} catch ( error ) {
					// Fall back to English if the MW locale isn't supported
					relativeTimeFormatter = new Intl.RelativeTimeFormat( 'en' );
				}

				let offsetThreshold = 1000;

				// If this was within the last minute, render in seconds.
				if ( offset < offsetThreshold * 60 ) {
					return relativeTimeFormatter.format(
						-Math.floor( offset / offsetThreshold ),
						'second'
					);
				}
				offsetThreshold *= 60;

				// If this was within the last hour, render in minutes.
				if ( offset < offsetThreshold * 60 ) {
					return relativeTimeFormatter.format(
						-Math.floor( offset / offsetThreshold ),
						'minute'
					);
				}
				offsetThreshold *= 60;

				// If this was within the last day, render in hours.
				if ( offset < offsetThreshold * 24 ) {
					return relativeTimeFormatter.format(
						-Math.floor( offset / offsetThreshold ),
						'hour'
					);
				}
				offsetThreshold *= 24;

				// If this was within the last week, render in days.
				if ( offset < offsetThreshold * 7 ) {
					return relativeTimeFormatter.format(
						-Math.floor( offset / offsetThreshold ),
						'hour'
					);
				}
				offsetThreshold *= 7;

				// If this was within the last four weeks, render in weeks.
				if ( offset < offsetThreshold * 4 ) {
					return relativeTimeFormatter.format(
						-Math.floor( offset / offsetThreshold ),
						'hour'
					);
				}
				offsetThreshold *= 4;
			}

			// Fallback for browsers without Intl
			return dateTimeString.replace( 'T', ' ' ).replace( 'Z', ' (UTC)' );
		},
		/**
		 * Returns whether the given payload is an instance of LabelData
		 *
		 * @param {LabelData|string} payload
		 * @return {boolean}
		 */
		isLabelData( payload ) {
			return ( payload instanceof LabelData );
		},
		/**
		 * Given a function call string representation, adds spacing
		 * before opening brackets and after divider commas
		 *
		 * @param {string} functionCall
		 * @return {string}
		 */
		addSpacing( functionCall ) {
			let spaced = functionCall.split( '(' ).join( ' (' );
			spaced = spaced.split( ',' ).join( ', ' );
			return spaced;
		}
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

	.ext-wikilambda-app-function-metadata-dialog__content {
		font-size: @wl-font-size-base;
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
