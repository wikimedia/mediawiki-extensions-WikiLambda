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
				:row-id="rowId"
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
			:metadata="getMetadata"
			@close-dialog="showMetadata = false"
		></wl-function-metadata-dialog>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapState } = require( 'pinia' );

const Constants = require( '../../../Constants.js' );
const FunctionMetadataDialog = require( './FunctionMetadataDialog.vue' );
const useMainStore = require( '../../../store/index.js' );
const ZObjectKeyValue = require( '../../default-view-types/ZObjectKeyValue.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-evaluation-result',
	components: {
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'wl-z-object-key-value': ZObjectKeyValue
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: undefined
		}
	},
	data: function () {
		return {
			showMetadata: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getMetadata',
		'getCurrentZObjectId',
		'getLabelData',
		'getZPersistentContentRowId',
		'getZObjectTypeByRowId'
	] ), {

		/**
		 * Returns whether there's a metadata value
		 *
		 * @return {boolean}
		 */
		hasMetadata: function () {
			return !!this.getMetadata;
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
			const contentRowId = this.getZPersistentContentRowId() || 0;
			const contentType = this.getZObjectTypeByRowId( contentRowId );
			// If the page is an implementation, return implementation label
			if ( contentType === Constants.Z_IMPLEMENTATION ) {
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
