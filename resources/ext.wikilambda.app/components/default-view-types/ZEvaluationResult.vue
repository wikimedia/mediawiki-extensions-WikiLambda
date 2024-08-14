<!--
	WikiLambda Vue component for Z22/Evaluation Result objects.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-evaluation-result">
		<div class="ext-wikilambda-app-evaluation-result__result">
			<wl-z-object-key-value
				v-if="hasResult"
				:skip-key="true"
				:row-id="resultRowId"
				:edit="false"
			></wl-z-object-key-value>
		</div>

		<!-- Action Bar -->
		<div class="ext-wikilambda-app-evaluation-result__actions">
			<a
				v-if="hasMetadata"
				class="ext-wikilambda-app-evaluation-result__action-details"
				role="button"
				@click="showMetadata = !showMetadata"
			>{{ $i18n( 'wikilambda-function-evaluator-result-details' ).text() }}</a>
			<a
				v-if="hasError"
				class="ext-wikilambda-app-evaluation-result__action-error"
				role="button"
				@click="showError = !showError"
			>
				{{ $i18n( 'wikilambda-functioncall-metadata-errors' ).text() }}
			</a>
		</div>

		<!-- All Dialogs -->
		<div>
			<!-- Function Metadata Dialog -->
			<wl-function-metadata-dialog
				v-if="hasMetadata"
				:open="showMetadata"
				:header-text="implementationName"
				:metadata="metadata"
				@close-dialog="showMetadata = false"
			></wl-function-metadata-dialog>

			<!-- Error Dialog -->
			<cdx-dialog
				v-if="hasError"
				:open="showError"
				class="ext-wikilambda-app-evaluation-result__error-dialog"
				:close-button-label="$i18n( 'wikilambda-dialog-close' ).text()"
				:title="$i18n( 'wikilambda-functioncall-metadata-errors' ).text()"
				@update:open="showError = false"
			>
				<!-- TODO (T320669): Construct this more nicely -->
				<wl-z-object-key-value
					:row-id="errorRowId"
					:edit="false"
				></wl-z-object-key-value>
			</cdx-dialog>
		</div>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const Constants = require( '../../Constants.js' ),
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	FunctionMetadataDialog = require( '../widgets/function-evaluator/FunctionMetadataDialog.vue' ),
	hybridToCanonical = require( '../../mixins/schemata.js' ).methods.hybridToCanonical,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-z-evaluation-result',
	components: {
		'wl-function-metadata-dialog': FunctionMetadataDialog,
		'cdx-dialog': CdxDialog
	},
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			showMetadata: false,
			showError: false
		};
	},
	computed: Object.assign( mapGetters( [
		'getCurrentZObjectId',
		'getLabelData',
		'getMapValueByKey',
		'getRowByKeyPath',
		'getZPersistentContentRowId',
		'getZObjectAsJsonById',
		'getZObjectTypeByRowId'
	] ), {
		/**
		 * Returns the row Id of the Response Envelope Value/Z22K1
		 *
		 * @return {string|undefined}
		 */
		resultRowId: function () {
			const row = this.getRowByKeyPath( [ Constants.Z_RESPONSEENVELOPE_VALUE ], this.rowId );
			return row ? row.id : undefined;
		},

		/**
		 * Returns the row Id of the Response Envelope Metadata/Z22K2
		 *
		 * @return {string|undefined}
		 */
		metadataRowId: function () {
			const row = this.getRowByKeyPath( [ Constants.Z_RESPONSEENVELOPE_METADATA ], this.rowId );
			return row ? row.id : undefined;
		},

		/**
		 * Returns the rowId of the Metadata object with key 'errors'
		 *
		 * @return {string|undefined}
		 */
		errorRowId: function () {
			const row = this.getMapValueByKey( this.metadataRowId, 'errors' );
			return row ? row.id : undefined;
		},

		/**
		 * Returns whether there's a result value
		 *
		 * @return {boolean}
		 */
		hasResult: function () {
			return this.resultRowId !== undefined;
		},

		/**
		 * Returns whether there's a metadata value
		 *
		 * @return {boolean}
		 */
		hasMetadata: function () {
			return this.metadataRowId !== undefined;
		},

		/**
		 * Returns whether there's an error key in the metadata
		 *
		 * @return {boolean}
		 */
		hasError: function () {
			return this.errorRowId !== undefined;
		},

		/**
		 * Returns the metadata canonical ZObject that the
		 * metadata dialog needs as an input, or undefined if
		 * there's no metadata.
		 *
		 * @return {Object | undefined}
		 */
		metadata: function () {
			return this.hasMetadata ?
				hybridToCanonical( this.getZObjectAsJsonById( this.metadataRowId ) ) :
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
			const contentRowId = this.getZPersistentContentRowId() || 0;
			const contentType = this.getZObjectTypeByRowId( contentRowId );
			// If the page is an implementation, return implementation label
			if ( contentType === Constants.Z_IMPLEMENTATION ) {
				return this.getLabelData( this.getCurrentZObjectId );
			}
			return undefined;
		}
	} ),
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	}
} );

</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-evaluation-result {
	.ext-wikilambda-app-evaluation-result__actions {
		display: flex;
		gap: @spacing-50;
	}
}
</style>
