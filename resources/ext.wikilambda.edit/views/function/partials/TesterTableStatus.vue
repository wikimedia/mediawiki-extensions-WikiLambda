<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-tester-table">
		<cdx-icon
			class="ext-wikilambda-tester-table__message-icon"
			:icon="statusIcon"
			:class="statusIconClass"
		></cdx-icon>
		<span class="ext-wikilambda-tester-table__message-status">
			{{ status }}
		</span>
		<cdx-icon
			v-if="testerStatus !== undefined"
			:icon="messageIcon"
			class="ext-wikilambda-tester-table__message-icon ext-wikilambda-tester-table__message-icon--info"
			@click.stop="handleMessageIconClick"
		></cdx-icon>
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<cdx-dialog
			v-model:open="showMetadata"
			:title="$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text()"
			close-button-label="Close"
		>
			<strong>{{ implementationLabel }}</strong>
			<br>
			<strong>{{ testerLabel }}</strong>
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
		</cdx-dialog>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	CdxDialog = require( '@wikimedia/codex' ).CdxDialog,
	icons = require( '../../../../lib/icons.json' ),
	schemata = require( '../../../mixins/schemata.js' ),
	portray = require( '../../../mixins/portray.js' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'tester-table-status',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-dialog': CdxDialog
	},
	mixins: [ portray, schemata ],
	props: {
		zFunctionId: {
			type: String,
			required: true
		},
		zImplementationId: {
			type: String,
			required: true
		},
		zTesterId: {
			type: String,
			required: true
		}
	},
	data: function () {
		return {
			showMetadata: false
		};
	},
	computed: $.extend( mapGetters( [
		'getZTesterResults',
		'getZTesterMetadata',
		'getNewTesterZObjects',
		'getZkeyLabels'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		status: function () {
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return this.$i18n( 'wikilambda-tester-status-pending' ).text();
			}
			if ( this.testerStatus === true ) {
				return this.$i18n( 'wikilambda-tester-status-passed' ).text();
			}
			if ( this.testerStatus === false ) {
				return this.$i18n( 'wikilambda-tester-status-failed' ).text();
			}
			return this.$i18n( 'wikilambda-tester-status-running' ).text();
		},
		statusIcon: function () {
			if ( this.testerStatus === true ) {
				return icons.cdxIconCheck;
			}
			if ( this.testerStatus === false ) {
				return icons.cdxIconClose;
			}
			// This will be used both for pending and running statuses
			return icons.cdxIconAlert;
		},
		statusIconClass: function () {
			if ( this.testerStatus === true ) {
				return 'ext-wikilambda-tester-result-status--PASS';
			}
			if ( this.testerStatus === false ) {
				return 'ext-wikilambda-tester-result-status--FAIL';
			}
			return 'ext-wikilambda-tester-result-status--RUNNING';
		},
		messageIcon: function () {
			return icons.cdxIconInfo;
		},
		dialogText: function () {
			const metadata = this.getZTesterMetadata(
				this.zFunctionId, this.zTesterId, this.zImplementationId );
			// TODO(T316567): avoid returning ''
			if ( metadata === undefined ) {
				return '';
			}
			// Ensure ZIDs appearing in metadata have been fetched
			const metadataZIDs = this.extractZIDs( metadata );
			this.fetchZKeys( { zids: metadataZIDs } );
			return this.portrayMetadataMap( metadata, this.getZkeyLabels );
		},
		implementationLabel: function () {
			return this.getZkeyLabels[ this.zImplementationId ];
		},
		testerLabel: function () {
			return this.getZkeyLabels[ this.zTesterId ] ||
				( this.getNewTesterZObjects &&
					this.getNewTesterZObjects[ Constants.Z_PERSISTENTOBJECT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ][ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ][
						Constants.Z_STRING_VALUE ] );
		},
		tooltipMetaDataHelpLink: function () {
			return this.$i18n( 'wikilambda-helplink-tooltip' ).text();
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchZKeys' ] ), {
		handleMessageIconClick: function () {
			// TODO(T315607): See if the metadata dialog behavior can be improved further.
			// TODO(T316567): Check if results are ready before showing metadata dialog
			if ( !this.showMetadata ) {
				this.showMetadata = true;
			} else {
				this.showMetadata = false;
			}
		},
		helpLinkIcon: function () {
			return icons.cdxIconHelpNotice;
		}
	} )
};
</script>

<style lang="less">
@import '../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tester-table {
	display: flex;
	text-transform: capitalize;

	&__message-icon {
		svg {
			width: 16px;
			height: 16px;
		}

		&--info {
			cursor: pointer;

			svg {
				width: 20px;
				height: 20px;
			}
		}
	}

	&__message-status {
		display: inline-block;
		margin: 0 8px;
	}

	&-status {
		&--PASS {
			color: @wmui-color-green30;
		}

		&--FAIL {
			color: @wmui-color-red30;
		}

		&--RUNNING {
			color: @wmui-color-yellow50;
		}
	}
}

.ext-wikilambda-metadatadialog-helplink {
	float: right;
}
</style>
