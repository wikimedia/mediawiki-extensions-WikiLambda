<!--
	WikiLambda Vue component for Z22/Evaluation Result objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-evaluation-result" data-testid="z-evaluation-result">
		<div class="ext-wikilambda-app-evaluation-result__result">
			<wl-z-object-key-value
				:skip-key="true"
				:key-path="responseKeyPath"
				:object-value="responseObject[ responseKey ]"
				:edit="false"
			></wl-z-object-key-value>
		</div>

		<!-- Action Bar -->
		<div class="ext-wikilambda-app-evaluation-result__actions">
			<cdx-button
				v-if="hasMetadata"
				class="ext-wikilambda-app-evaluation-result__action-details"
				@click="showMetadata = !showMetadata"
				@keydown.enter="showMetadata = !showMetadata"
			>
				{{ $i18n( 'wikilambda-function-evaluator-result-details' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="showShareButton"
				v-tooltip:bottom="$i18n( 'wikilambda-function-evaluator-share-button-tooltip' ).text()"
				data-testid="evaluation-result-share-button"
				@click="shareFunction"
			>
				<cdx-icon :icon="iconLink"></cdx-icon>
				{{ $i18n( 'wikilambda-function-evaluator-share-button' ).text() }}
				<cdx-icon v-if="linkCopied" :icon="iconCheck"></cdx-icon>
			</cdx-button>
		</div>
		<!-- Function Metadata Dialog -->
		<wl-function-metadata-dialog
			v-if="hasMetadata"
			:open="showMetadata"
			:header-text="implementationName"
			:metadata="metadata"
			@close-dialog="showMetadata = false"
		></wl-function-metadata-dialog>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const clipboardMixin = require( '../../../mixins/clipboardMixin.js' );
const { hybridToCanonical } = require( '../../../utils/schemata.js' );
const { getZFunctionCallFunctionId } = require( '../../../utils/zobjectUtils.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );
const icons = require( '../../../../lib/icons.json' );

// Type components
const ZObjectKeyValue = require( '../../types/ZObjectKeyValue.vue' );
// Widget components
const FunctionMetadataDialog = require( './FunctionMetadataDialog.vue' );
// Codex components
const { CdxButton, CdxIcon, CdxTooltip } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-evaluation-result',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	directives: {
		tooltip: CdxTooltip
	},
	mixins: [ clipboardMixin ],
	props: {
		contentType: {
			type: String,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			showMetadata: false,
			linkCopied: false,
			responseKey: Constants.Z_RESPONSEENVELOPE_VALUE,
			responseKeyPath: [
				Constants.STORED_OBJECTS.RESPONSE,
				Constants.Z_RESPONSEENVELOPE_VALUE
			].join( '.' ),
			iconLink: icons.cdxIconLink,
			iconCheck: icons.cdxIconCheck
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getLabelData',
		'getZObjectByKeyPath',
		'getCurrentView'
	] ), {

		/**
		 * Returns whether we're on the RunFunction page
		 *
		 * @return {boolean}
		 */
		isRunFunctionPage: function () {
			return this.getCurrentView === Constants.VIEWS.FUNCTION_EVALUATOR;
		},

		/**
		 * Returns whether the share button should be shown
		 * (hidden on tester and implementation pages)
		 *
		 * @return {boolean}
		 */
		showShareButton: function () {
			return this.selectedFunctionZid &&
				this.contentType !== Constants.Z_TESTER &&
				this.contentType !== Constants.Z_IMPLEMENTATION;
		},
		/**
		 * The function call response object as set in the store
		 *
		 * @return {Object}
		 */
		responseObject: function () {
			return this.getZObjectByKeyPath( [ Constants.STORED_OBJECTS.RESPONSE ] );
		},

		/**
		 * Returns whether there's a metadata value
		 *
		 * @return {boolean}
		 */
		hasMetadata: function () {
			return this.responseObject &&
				typeof this.responseObject === 'object' &&
				Constants.Z_RESPONSEENVELOPE_METADATA in this.responseObject;
		},

		/**
		 * Returns the metadata/Z22K2 object, if defined.
		 *
		 * @return {Object|undefined}
		 */
		metadata: function () {
			return this.hasMetadata ?
				hybridToCanonical( this.responseObject[ Constants.Z_RESPONSEENVELOPE_METADATA ] ) :
				undefined;
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
		 * If we are in an implementation page, return the implementation
		 * label in the user language. Else return undefined
		 *
		 * @return {string|undefined}
		 */
		implementationName: function () {
			// If the page is an implementation, return implementation label
			if ( this.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				return this.getLabelData( this.getCurrentZObjectId );
			}
			return undefined;
		},

		/**
		 * Returns the selected function call object
		 *
		 * @return {Object|undefined}
		 */
		selectedFunctionCall: function () {
			return this.getZObjectByKeyPath( [ Constants.STORED_OBJECTS.FUNCTION_CALL ] );
		},

		/**
		 * Returns the selected function ZID from the function call
		 *
		 * @return {string|undefined}
		 */
		selectedFunctionZid: function () {
			if ( !this.selectedFunctionCall ) {
				return undefined;
			}
			return getZFunctionCallFunctionId( this.selectedFunctionCall );
		}
	} ),
	methods: {
		/**
		 * Generates a shareable URL for the current function call and copies it to clipboard
		 */
		shareFunction: function () {
			try {
				// Convert to canonical form
				const canonicalFunctionCall = hybridToCanonical( this.selectedFunctionCall );

				// Generate shareable URL (appends to current page)
				const shareUrl = urlUtils.generateShareUrl( canonicalFunctionCall );

				// Copy to clipboard
				this.copyToClipboard(
					shareUrl,
					() => {
						this.linkCopied = true;
						const interactionData = {
							zlang: this.getUserLangZid || null,
							zobjectid: this.getCurrentZObjectId || null,
							zobjecttype: this.getCurrentZObjectType || null,
							selectedfunctionzid: this.selectedFunctionZid || null,
							haserrors: !!this.hasMetadataErrors
						};
						this.submitInteraction( 'share', interactionData );
					},
					() => {
						this.linkCopied = false;
					}
				);
			} catch ( _e ) {
				// Do nothing for now
			}
		}
	}
} );

</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-evaluation-result {
	.ext-wikilambda-app-evaluation-result__actions {
		display: flex;
		gap: @spacing-50;
		flex-wrap: wrap;
	}
}
</style>
