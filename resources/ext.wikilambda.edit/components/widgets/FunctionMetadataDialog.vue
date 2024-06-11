<!--
	WikiLambda Vue component for the Function Metadata Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-dialog
		class="ext-wikilambda-metadata-dialog"
		:title="$i18n( 'wikilambda-about-widget-accessible-title' ).text()"
		:open="open"
		@update:open="closeDialog"
	>
		<!-- Dialog Header -->
		<template #header>
			<div class="cdx-dialog__header--default">
				<div class="cdx-dialog__header__title-group">
					<h2 class="cdx-dialog__header__title">
						{{ $i18n( 'wikilambda-function-evaluator-result-details' ).text() }}
					</h2>
					<p
						v-if="headerText"
						class="cdx-dialog__header__subtitle"
						:lang="headerText.langCode"
						:dir="headerText.langDir"
					>
						{{ headerText.label }}
					</p>
				</div>

				<div class="ext-wikilambda-metadata-dialog-helplink">
					<cdx-icon :icon="icons.cdxIconHelpNotice"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						:href="parsedMetaDataHelpLink"
						target="_blank"
					>{{ $i18n( 'wikilambda-helplink-button' ).text() }}</a>
					<cdx-button
						weight="quiet"
						class="cdx-dialog__header__close-button"
						@click="closeDialog"
					>
						<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
					</cdx-button>
				</div>
			</div>
		</template>

		<!-- Dialog Body -->
		<div class="ext-wikilambda-metadata-dialog-body">
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
				<ul class="ext-wikilambda-metadata-dialog-content">
					<li
						v-for="( item, itemIndex ) in section.content"
						:key="'item' + itemIndex"
						class="ext-wikilambda-metadata-dialog-key"
					>
						<span class="ext-wikilambda-metadata-dialog-key-title">{{ item.title }}</span>:
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
								class="ext-wikilambda-metadata-dialog-subkey"
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
const CdxAccordion = require( '@wikimedia/codex' ).CdxAccordion,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	metadataConfig = require( '../../mixins/metadata.js' ),
	schemata = require( '../../mixins/schemata.js' ).methods,
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	LabelData = require( '../../store/classes/LabelData.js' ),
	icons = require( '../../../lib/icons.json' );

module.exports = exports = defineComponent( {
	name: 'wl-function-metadata-dialog',
	components: {
		'cdx-accordion': CdxAccordion,
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog,
		'cdx-icon': CdxIcon
	},
	mixins: [ metadataConfig ],
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
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: Object.assign( mapGetters( [
		'getLabelData',
		'getUserLangCode'
	] ), {
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
			if ( !this.metadata ) {
				return undefined;
			}
			const benjamin = this.metadata[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
			const items = benjamin.slice( 1 );
			return new Map( items.map( ( pair ) => [
				pair[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ],
				pair[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ]
			] ) );
		},
		/**
		 * @return {Array}
		 */
		sections: function () {
			if ( !this.keyValues ) {
				return [];
			}
			return this.compileSections( this.metadataKeys );
		}
	} ),
	methods: {
		/**
		 * Close the dialog.
		 */
		closeDialog: function () {
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
			const suberrors = schemata.extractErrorStructure( error );
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
			return typeUtils.isValidZidFormat( zid ) ? this.getLabelData( zid ) : '';
		},
		/**
		 * Returns the duration section summary
		 *
		 * @return {string}
		 */
		getDurationSummary: function () {
			return this.sumValuesWithUnit( [
				this.keyValues.get( 'orchestrationDuration' ),
				this.keyValues.get( 'evaluationDuration' )
			], 'ms' );
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
			const suberrors = schemata.extractErrorStructure( value );
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
			if ( typeUtils.isValidZidFormat( zid ) ) {
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
		}
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-metadata-dialog {
	.cdx-dialog__header--default {
		align-items: flex-start;
		gap: @spacing-100;

		.cdx-dialog__header__title-group {
			margin-top: @spacing-12;
		}
	}

	.ext-wikilambda-metadata-dialog-helplink {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: @spacing-25;
		margin-top: -@spacing-25;

		> a {
			margin-right: @spacing-25;
		}

		> .cdx-icon {
			color: @color-base;
		}
	}

	.ext-wikilambda-metadata-dialog-body {
		color: @color-base;

		li {
			font-size: @wl-font-size-base;
		}
	}
}
</style>
