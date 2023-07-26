<!--
	WikiLambda Vue component for the Function Metadata Dialog.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-dialog
		class="ext-wikilambda-metadata-dialog"
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
				</div>

				<div class="ext-wikilambda-metadata-dialog-helplink">
					<cdx-icon :icon="icons.cdxIconHelpNotice"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						:href="parsedMetaDataHelpLink"
						target="_blank">
						{{ $i18n( 'wikilambda-helplink-button' ).text() }}
					</a>
				</div>

				<cdx-button
					weight="quiet"
					class="cdx-dialog__header__close-button"
					@click="closeDialog"
				>
					<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
				</cdx-button>
			</div>
		</template>

		<!-- Dialog Body -->
		<div class="ext-wikilambda-metadata-dialog-body">
			<p
				v-if="implementationLabel"
				class="ext-wikilambda-metadata-dialog-body-implementation"
			>
				{{ implementationLabel }}
			</p>
			<p
				v-if="testerLabel"
				class="ext-wikilambda-metadata-dialog-body-tester"
			>
				{{ testerLabel }}
			</p>
			<span
				v-if="metadata"
				v-html="dialogText"
			>
			</span>
		</div>
	</cdx-dialog>
</template>

<script>
var CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	schemata = require( '../../mixins/schemata.js' ),
	portray = require( '../../mixins/portray.js' ),
	icons = require( '../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-metadata-dialog',
	components: {
		'cdx-dialog': CdxDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ portray, schemata ],
	props: {
		open: {
			type: Boolean,
			required: true,
			default: false
		},
		implementationLabel: {
			type: String,
			required: false,
			default: ''
		},
		testerLabel: {
			type: String,
			required: false,
			default: ''
		},
		metadata: {
			type: Object,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel'
	] ), {
		/**
		 * Returns the text representation of the Metadata
		 *
		 * @return {string}
		 */
		dialogText: function () {
			if ( this.metadata ) {
				// Ensure ZIDs appearing in metadata have been fetched
				const metadataZIDs = this.extractZIDs( this.metadata );
				this.fetchZKeys( { zids: metadataZIDs } );
				return this.portrayMetadataMap( this.metadata, this.getLabel );
			}
			return '';
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
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys'
	] ), {
		/**
		 * Close the dialog.
		 */
		closeDialog: function () {
			this.$emit( 'close-dialog' );
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-metadata-dialog {
	.cdx-dialog__header--default {
		align-items: center;
		gap: @spacing-100;
	}

	.ext-wikilambda-metadata-dialog-helplink {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: @spacing-25;

		> .cdx-icon {
			color: @color-base;
		}
	}

	.ext-wikilambda-metadata-dialog-body {
		color: @color-base;
	}
}
</style>
