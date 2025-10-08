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
				{{ i18n( 'wikilambda-function-evaluator-result-details' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="showShareButton"
				v-tooltip:bottom="i18n( 'wikilambda-function-evaluator-share-button-tooltip' ).text()"
				data-testid="evaluation-result-share-button"
				@click="shareFunction"
			>
				<cdx-icon :icon="iconLink"></cdx-icon>
				{{ i18n( 'wikilambda-function-evaluator-share-button' ).text() }}
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
const { computed, defineComponent, inject, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const useClipboard = require( '../../../composables/useClipboard.js' );
const useEventLog = require( '../../../composables/useEventLog.js' );
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
	props: {
		contentType: {
			type: String,
			required: false,
			default: undefined
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const clipboard = useClipboard();
		const eventLog = useEventLog();
		const linkCopied = ref( false );
		const iconLink = icons.cdxIconLink;
		const iconCheck = icons.cdxIconCheck;
		const showMetadata = ref( false );
		const responseKey = Constants.Z_RESPONSEENVELOPE_VALUE;
		const responseKeyPath = [
			Constants.STORED_OBJECTS.RESPONSE,
			Constants.Z_RESPONSEENVELOPE_VALUE
		].join( '.' );

		/**
		 * The function call response object as set in the store
		 *
		 * @return {Object}
		 */
		const responseObject = computed( () => store.getZObjectByKeyPath( [ Constants.STORED_OBJECTS.RESPONSE ] ) );

		/**
		 * Returns whether there's a metadata value
		 *
		 * @return {boolean}
		 */
		const hasMetadata = computed( () => responseObject.value &&
				typeof responseObject.value === 'object' &&
				Constants.Z_RESPONSEENVELOPE_METADATA in responseObject.value );

		/**
		 * Returns the metadata/Z22K2 object, if defined.
		 *
		 * @return {Object|undefined}
		 */
		const metadata = computed( () => hasMetadata.value ?
			hybridToCanonical( responseObject.value[ Constants.Z_RESPONSEENVELOPE_METADATA ] ) :
			undefined );

		/**
		 * Returns the selected function call object
		 *
		 * @return {Object|undefined}
		 */
		const selectedFunctionCall = computed( () => store.getZObjectByKeyPath(
			[ Constants.STORED_OBJECTS.FUNCTION_CALL ]
		) );

		/**
		 * Returns the selected function ZID from the function call
		 *
		 * @return {string|undefined}
		 */
		const selectedFunctionZid = computed( () => {
			if ( !selectedFunctionCall.value ) {
				return undefined;
			}
			return getZFunctionCallFunctionId( selectedFunctionCall.value );
		} );

		/**
		 * Returns whether the share button should be shown
		 * (hidden on tester and implementation pages)
		 *
		 * @return {boolean}
		 */
		const showShareButton = computed( () => selectedFunctionZid.value &&
				props.contentType !== Constants.Z_TESTER &&
				props.contentType !== Constants.Z_IMPLEMENTATION );

		/**
		 * If we are in an implementation page, return the implementation
		 * label in the user language. Else return undefined
		 *
		 * @return {string|undefined}
		 */
		const implementationName = computed( () => {
			// If the page is an implementation, return implementation label
			if ( store.getCurrentZObjectType === Constants.Z_IMPLEMENTATION ) {
				return store.getLabelData( store.getCurrentZObjectId );
			}
			return undefined;
		} );

		/**
		 * Generates a shareable URL for the current function call and copies it to clipboard
		 */
		function shareFunction() {
			try {
				// Convert to canonical form
				const canonicalFunctionCall = hybridToCanonical( selectedFunctionCall.value );

				// Generate shareable URL (appends to current page)
				const shareUrl = urlUtils.generateShareUrl( canonicalFunctionCall );

				// Copy to clipboard
				clipboard.copyToClipboard(
					shareUrl,
					() => {
						linkCopied.value = true;
						const interactionData = {
							zlang: store.getUserLangZid || null,
							zobjectid: store.getCurrentZObjectId || null,
							zobjecttype: store.getCurrentZObjectType || null,
							selectedfunctionzid: selectedFunctionZid.value || null,
							haserrors: !!store.hasMetadataErrors
						};
						eventLog.submitInteraction( 'share', interactionData );
					},
					() => {
						linkCopied.value = false;
					}
				);
			} catch ( _e ) {
				// Do nothing for now
			}
		}

		return {
			i18n,
			hasMetadata,
			iconLink,
			iconCheck,
			implementationName,
			linkCopied,
			metadata,
			responseKey,
			responseKeyPath,
			responseObject,
			showMetadata,
			showShareButton,
			shareFunction
		};
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
