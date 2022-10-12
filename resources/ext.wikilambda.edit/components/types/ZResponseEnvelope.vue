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
		<dialog-container
			ref="dialogBox"
			size="auto"
			:show-action-buttons="false"
			@exit-dialog="showMetrics = false"
			@close-dialog="showMetrics = false"
		>
			<!-- TODO (T320670): This should be a call to a dialog component, not a filled-in template. -->
			<template #dialog-container-title>
				<strong>{{ dialogTitle }}</strong>
			</template>
			<template>
				<!-- TODO (T320669): Construct this more nicely, perhaps with a Codex link component? -->
				<div class="ext-wikilambda-metadatadialog-helplink">
					<cdx-icon :icon="helpLinkIcon()"></cdx-icon>
					<a
						:title="tooltipMetaDataHelpLink"
						href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikifunctions/Function_call_metadata"
						target="_blank">
						{{ $i18n( 'wikilambda-helplink-button' ).text() }}
					</a>
				</div>
				<span v-html="dialogText"></span>
			</template>
		</dialog-container>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZObjectKey = require( '../ZObjectKey.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	DialogContainer = require( '../base/DialogContainer.vue' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject,
	portray = require( '../../mixins/portray.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	components: {
		'z-object-key': ZObjectKey,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'dialog-container': DialogContainer
	},
	mixins: [ typeUtils, portray ],
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
			showMetrics: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getNestedZObjectById',
		'getZObjectAsJsonById'
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
			const errors = this.isZError( metadata.id ) ? metadata : this.getZMapValue( metadata.id, 'errors' );
			return errors;
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
	methods: {
		openMetrics: function () {
			this.showMetrics = true;
			this.$refs.dialogBox.openDialog();
		},
		isZError: function ( zobjectId ) {
			const zType = this.getNestedZObjectById( zobjectId,
				[ Constants.Z_OBJECT_TYPE, Constants.Z_REFERENCE_ID ] );
			return zType.value === Constants.Z_ERROR;
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
			return this.portrayMetadataMap( zMapJSON );
		},
		helpLinkIcon: function () {
			return icons.cdxIconHelpNotice;
		}
	}
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
