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
			<a
				v-if="hasMetadata"
				class="ext-wikilambda-app-evaluation-result__action-details"
				role="button"
				tabindex="0"
				@click="showMetadata = !showMetadata"
				@keydown.enter="showMetadata = !showMetadata"
			>{{ $i18n( 'wikilambda-function-evaluator-result-details' ).text() }}</a>
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
const { hybridToCanonical } = require( '../../../utils/schemata.js' );

// Type components
const ZObjectKeyValue = require( '../../types/ZObjectKeyValue.vue' );
// Widget components
const FunctionMetadataDialog = require( './FunctionMetadataDialog.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-evaluation-result',
	components: {
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	data: function () {
		return {
			showMetadata: false,
			responseKey: Constants.Z_RESPONSEENVELOPE_VALUE,
			responseKeyPath: [
				Constants.STORED_OBJECTS.RESPONSE,
				Constants.Z_RESPONSEENVELOPE_VALUE
			].join( '.' )
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getCurrentZObjectId',
		'getCurrentZObjectType',
		'getLabelData',
		'getZObjectByKeyPath'
	] ), {
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
		}
	} )
} );

</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-evaluation-result {
	.ext-wikilambda-app-evaluation-result__actions {
		display: flex;
		gap: @spacing-50;
	}
}
</style>
