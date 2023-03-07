<template>
	<!--
		WikiLambda Vue component for the Metadata Dialog.

		@copyright 2023– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<cdx-dialog
		id="metadata-dialog"
		class="ext-wikilambda-metadatadialog"
		:open="showDialog"
		@update:open="closeDialog"
	>
		<div class="ext-wikilambda-metadatadialog__header">
			<span class="ext-wikilambda-metadatadialog__header__title">
				{{ $i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text() }}
			</span>
			<!-- TODO (T320669): Construct this more nicely, perhaps with a Codex link component? -->
			<div class="ext-wikilambda-metadatadialog__header__helplink">
				<cdx-icon :icon="icons.cdxIconHelpNotice"></cdx-icon>
				<a
					:title="tooltipMetaDataHelpLink"
					class="ext-wikilambda-metadatadialog__header__helplink-text"
					:href="parsedMetaDataHelpLink"
					target="_blank">
					{{ $i18n( 'wikilambda-helplink-button' ).text() }}
				</a>
			</div>
			<cdx-button
				type="quiet"
				class="ext-wikilambda-metadatadialog__header__close-button"
				@click="closeDialog"
			>
				<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
			</cdx-button>
		</div>
		<strong v-if="implementationLabel">{{ implementationLabel }}</strong>
		<br>
		<strong v-if="testerLabel">{{ testerLabel }}</strong>
		<span
			v-if="metadata"
			v-html="dialogText"
		>
		</span>
	</cdx-dialog>
</template>

<script>
var CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	schemata = require( '../../../../mixins/schemata.js' ),
	portray = require( '../../../../mixins/portray.js' ),
	icons = require( '../../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-metadata-dialog',
	components: {
		'cdx-dialog': CdxDialog,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	mixins: [ portray, schemata ],
	props: {
		showDialog: {
			type: Boolean,
			required: true
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
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [ 'getZkeyLabels' ] ), {
		dialogText: function () {
			// Ensure ZIDs appearing in metadata have been fetched
			const metadataZIDs = this.extractZIDs( this.metadata );
			this.fetchZKeys( { zids: metadataZIDs } );
			return this.portrayMetadataMap( this.metadata, this.getZkeyLabels );
		},
		parsedMetaDataHelpLink: function () {
			const unformattedLink = this.$i18n( 'wikilambda-metadata-help-link' ).text();
			return mw.internalWikiUrlencode( unformattedLink );
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys' ] ), {
		closeDialog: function () {
			this.$emit( 'close-dialog' );
		}
	} )
};
</script>

<style lang="less">
@import '../../../../ext.wikilambda.edit.less';

/* stylelint-disable selector-max-id */
#metadata-dialog .cdx-dialog__header {
	display: none;
}

.ext-wikilambda-metadatadialog {
	&__header {
		display: flex;
		justify-content: space-between;
		padding: @spacing-50 0;
		position: sticky;
		top: 0;
		background: @background-color-base;

		&__title {
			width: 100%;
			font-weight: bold;
			font-size: 1.15em;
			margin: auto;
			display: flex;

			&-link {
				margin-left: @spacing-50;
			}
		}

		&__helplink {
			display: flex;
			margin: auto;

			&-text {
				margin-left: @spacing-50;
				margin-right: @spacing-100;
			}
		}

		&__close-button {
			display: flex;
			color: @color-base;
			justify-content: center;
			align-items: center;
			height: @size-200;
			width: @size-200;
			background: none;
			border: 0;
			margin: auto;
		}
	}
}
</style>
