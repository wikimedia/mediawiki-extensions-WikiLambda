<template>
	<!--
		WikiLambda Vue component for ZResponseEnvelope objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zresponseenvelope">
		<div>
			<z-object-key
				:zobject-id="zValue.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
		<div v-if="containsError" class="ext-wikilambda-zresponseenvelope__show-error">
			<cdx-button
				@click.prevent="showError = !showError"
			>
				{{ errorButtonText }}
			</cdx-button>
		</div>
		<div v-if="containsError && showError" class="ext-wikilambda-zresponseenvelope__error">
			<hr>
			<z-object-key
				:zobject-id="zError.id"
				:parent-type="Constants.Z_RESPONSEENVELOPE"
				:readonly="readonly"
			></z-object-key>
		</div>
		<div class="ext-wikilambda-zresponseenvelope__show-metrics">
			<cdx-button
				@click.stop="openMetrics"
			>
				{{ metricsButtonText }}
			</cdx-button>
		</div>
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<cdx-dialog
			id="metadata-dialog"
			v-model:open="showMetrics"
			title=""
		>
			<div class="ext-wikilambda-metadatadialog__header">
				<span class="ext-wikilambda-metadatadialog__header__title">
					{{ dialogTitle }}
				</span>
				<!-- TODO (T320669): Construct this more nicely, perhaps with a Codex link component? -->
				<div class="ext-wikilambda-metadatadialog__header__helplink">
					<cdx-icon :icon="helpLinkIcon()"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikifunctions/Function_call_metadata"
						target="_blank">
						{{ $i18n( 'wikilambda-helplink-button' ).text() }}
					</a>
				</div>
				<cdx-button
					type="quiet"
					class="ext-wikilambda-metadatadialog__header__close-button"
					@click="showMetrics = false"
				>
					<cdx-icon :icon="icons.cdxIconClose"></cdx-icon>
				</cdx-button>
			</div>
			<span v-html="dialogText"></span>
		</cdx-dialog>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	icons = require( '../../../lib/icons.json' ),
	portray = require( '../../mixins/portray.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	schemata = require( '../../mixins/schemata.js' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'z-object-key': ZObjectKey,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'cdx-dialog': CdxDialog
	},
	mixins: [ typeUtils, portray, schemata ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			showError: true,
			showMetrics: false,
			icons: icons
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZObjectAsJsonById',
		'getZkeyLabels'
	] ), {
		Constants: function () {
			return Constants;
		},
		zobject: function () {
			return this.getZObjectChildrenById( this.zobjectId );
		},
		zValue: function () {
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_VALUE, this.zobject );
		},
		zMetaData: function () {
			return this.findKeyInArray( Constants.Z_RESPONSEENVELOPE_METADATA, this.zobject );
		},
		zError: function () {
			const metadata = this.zMetaData;
			return this.getZMapValue( metadata.id, 'errors' );
		},
		containsError: function () {
			return this.zError !== false;
		},
		errorButtonText: function () {
			// TODO(T312610): Depending on design choices, this button may go away
			if ( this.showError ) {
				return this.$i18n( 'wikilambda-hide-error' ).text();
			} else {
				return this.$i18n( 'wikilambda-show-error' ).text();
			}
		},
		metricsButtonText: function () {
			// This button brings up the "metadata dialog" (internal name); we use the word "metrics" in the UI
			// TODO(T312610): Depending on design choices, these button labels could change
			if ( this.showMetrics ) {
				return this.$i18n( 'wikilambda-hide-metrics' ).text();
			} else {
				return this.$i18n( 'wikilambda-show-metrics' ).text();
			}
		},
		dialogText: function () {
			return this.dialogContent( this.zMetaData.id );
		},
		dialogTitle: function () {
			return this.$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text();
		},
		tooltipMetaDataHelpLink: function () {
			return this.$i18n( 'wikilambda-helplink-tooltip' ).text();
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys' ] ), {
		openMetrics: function () {
			this.showMetrics = true;
		},
		getZMapValue: function ( zMapId, key ) {
			const listOfPairs = this.getNestedZObjectById( zMapId, [ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] );
			const elements = this.getZObjectChildrenById( listOfPairs.id );
			for ( const pair of elements ) {
				if ( this.getNestedZObjectById( pair.id,
					[ Constants.Z_TYPED_OBJECT_ELEMENT_1, Constants.Z_STRING_VALUE ] ).value === key ) {
					return this.getNestedZObjectById( pair.id, [ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] );
				}
			}
			return false;
		},
		dialogContent: function ( zMapId ) {
			const zMapJSON = canonicalize( this.getZObjectAsJsonById( zMapId ) );
			// Ensure ZIDs appearing in metadata map have been fetched
			const metadataZIDs = this.extractZIDs( zMapJSON );
			this.fetchZKeys( { zids: metadataZIDs } );
			return this.portrayMetadataMap( zMapJSON, this.getZkeyLabels );
		},
		helpLinkIcon: function () {
			return icons.cdxIconHelpNotice;
		}
	} )
};
</script>

<style lang="less">
@import './../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-zresponseenvelope {
	&__show-error {
		padding: 10px 0;
	}
}

.ext-wikilambda-metadatadialog-helplink {
	float: right;
}
</style>
