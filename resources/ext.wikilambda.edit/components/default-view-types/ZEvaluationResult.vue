<template>
	<!--
		WikiLambda Vue component for Z22/Evaluation Result objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-evaluation-result">
		<div class="ext-wikilambda-evaluation-result-result">
			<wl-z-object-key-value
				v-if="hasResult"
				:row-id="resultRowId"
			></wl-z-object-key-value>
		</div>

		<!-- Button Bar -->
		<div class="ext-wikilambda-evaluation-result-buttons">
			<!-- Button to see metdata dialog -->
			<cdx-button
				class="ext-wikilambda-evaluation-result-buttons__metadata"
				:disabled="!hasMetadata"
				@click="showMetadata = !showMetadata"
			>
				{{ metadataButtonText }}
			</cdx-button>
			<!-- Button to see error dialog -->
			<cdx-button
				class="ext-wikilambda-evaluation-result-buttons__error"
				:disabled="!hasError"
				@click="showError = !showError"
			>
				{{ errorButtonText }}
			</cdx-button>
		</div>

		<!-- All Dialogs -->
		<div>
			<!-- Metadata Dialog -->
			<cdx-dialog
				v-if="hasMetadata"
				:open="showMetadata"
				class="ext-wikilambda-evaluation-result-metadata-dialog"
				:close-button-label="closeLabel"
				:title="metadataTitle"
				@update:open="closeMetadata"
			>
				<!-- TODO (T320669): Construct this more nicely -->
				<div class="ext-wikilambda-metadatadialog__header__helplink">
					<cdx-icon :icon="icons.cdxIconHelpNotice"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						:href="parsedMetaDataHelpLink"
						target="_blank">
						{{ $i18n( 'wikilambda-helplink-button' ).text() }}
					</a>
				</div>
				<span v-html="dialogText"></span>
			</cdx-dialog>

			<!-- Error Dialog -->
			<cdx-dialog
				v-if="hasError"
				:open="showError"
				class="ext-wikilambda-evaluation-result-error-dialog"
				:close-button-label="closeLabel"
				:title="errorTitle"
				@update:open="closeError"
			>
				<!-- TODO (T317556): i18n Dialog title and Close when we have better design -->
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
var Constants = require( '../../Constants.js' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	icons = require( '../../../lib/icons.json' ),
	portray = require( '../../mixins/portray.js' ),
	schemata = require( '../../mixins/schemata.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-evaluation-result',
	components: {
		'cdx-button': CdxButton,
		'cdx-dialog': CdxDialog
	},
	mixins: [ schemata, portray ],
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		}
	},
	data: function () {
		return {
			icons: icons,
			showMetadata: false,
			showError: false
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getMapValueByKey',
		'getRowByKeyPath',
		'getZObjectAsJsonById'
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
		 * Returns the title for the Metadata dialog
		 *
		 * @return {string}
		 */
		metadataTitle: function () {
			return this.$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text();
		},

		/**
		 * Returns the title for the Error dialog
		 * TODO(T312610): Depending on design choices, this dialog might go away
		 *
		 * @return {string}
		 */
		errorTitle: function () {
			return this.$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text();
		},

		/**
		 * Returns the name for the Close dialog button
		 *
		 * @return {string}
		 */
		closeLabel: function () {
			return 'Close';
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
		 * Returns the text representation of the Metadata
		 *
		 * @return {string}
		 */
		dialogText: function () {
			return this.metadataRowId ? this.dialogContent( this.metadataRowId ) : '';
		},

		/**
		 * Returns the message of the "Show error" button
		 *
		 * @return {string}
		 */
		errorButtonText: function () {
			// TODO(T312610): Depending on design choices, this button may go away
			return this.$i18n( 'wikilambda-show-error' ).text();
		},

		/**
		 * Returns the message of the "Show metadata" button
		 *
		 * @return {string}
		 */
		metadataButtonText: function () {
			// This button brings up the "metadata dialog" (internal name); we use the word "metrics" in the UI
			// TODO(T312610): Depending on design choices, these button labels could change
			return this.$i18n( 'wikilambda-show-metrics' ).text();
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys'
	] ), {
		/**
		 * Close the Metadata dialog
		 */
		closeMetadata: function () {
			this.showMetadata = false;
		},

		/**
		 * Close the Error dialog
		 */
		closeError: function () {
			this.showError = false;
		},

		/**
		 * Transforms the metadata object into text for the Metadata dialog
		 * given the Metadata object rowId
		 *
		 * @param {string} rowId
		 * @return {string}
		 */
		dialogContent: function ( rowId ) {
			const zMapJSON = canonicalize( this.getZObjectAsJsonById( rowId ) );
			// Ensure ZIDs appearing in metadata map have been fetched
			const metadataZIDs = this.extractZIDs( zMapJSON );
			this.fetchZKeys( { zids: metadataZIDs } );
			return this.portrayMetadataMap( zMapJSON, this.getLabel );
		}
	} ),
	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( './ZObjectKeyValue.vue' );
	},
	mounted: function () {
		this.fetchZKeys( { zids: [ Constants.Z_RESPONSEENVELOPE ] } );
	}
};

</script>
