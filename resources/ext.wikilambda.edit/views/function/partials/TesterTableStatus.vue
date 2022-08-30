<template>
	<!--
		WikiLambda Vue component for the details tab in the ZFunction Viewer.

		@copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-tester-table">
		<cdx-icon
			:icon="statusIcon"
			:class="statusIconClass"
		></cdx-icon>
		{{ status }}
		<cdx-icon
			:icon="messageIcon"
			class="ext-wikilambda-tester-table-message-icon"
			@click.stop="handleMessageIconClick"
		></cdx-icon>
		<dialog-container
			ref="dialogBox"
			:title="dialogTitle"
			:description="dialogText"
			:show-action-buttons="false"
			:custom-class="customDialogClass"
			@exit-dialog="showMetadata = false"
			@close-dialog="showMetadata = false"
		>
		</dialog-container>
	</div>
</template>

<script>
var Constants = require( '../../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../../lib/icons.json' ),
	DialogContainer = require( '../../../components/base/DialogContainer.vue' ),
	portray = require( '../../../mixins/portray.js' );

// @vue/component
module.exports = exports = {
	name: 'tester-table-status',
	components: {
		'cdx-icon': CdxIcon,
		'dialog-container': DialogContainer
	},
	mixins: [ portray ],
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
			showMetadata: false,
			customDialogClass: 'ext-wikilambda-tester-table-dialog'
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
			// Check for error object, for backwards compatibility
			if ( metadata[ Constants.Z_OBJECT_TYPE ] === Constants.Z_ERROR ) {
				return '';
			}
			return this.portrayMetadataMap( metadata );
		},
		dialogTitle: function () {
			const testerLabel = this.getZkeyLabels[ this.zTesterId ] ||
				( this.getNewTesterZObjects &&
					this.getNewTesterZObjects[ Constants.Z_PERSISTENTOBJECT_LABEL ][
						Constants.Z_MULTILINGUALSTRING_VALUE ][ 0 ][ Constants.Z_MONOLINGUALSTRING_VALUE ][
						Constants.Z_STRING_VALUE ] );
			const implementationLabel = this.getZkeyLabels[ this.zImplementationId ];
			return '<strong>' + this.$i18n( 'wikilambda-functioncall-metadata-dialog-header' ).text() + '<br>' +
				implementationLabel + '<br>' + testerLabel + '</strong>';
		}
	} ),
	methods: {
		handleMessageIconClick: function () {
			// TODO(T315607): See if the metadata dialog behavior can be improved further.
			// TODO(T316567): Check if results are ready before showing metadata dialog
			if ( !this.showMetadata ) {
				this.showMetadata = true;
				this.$refs.dialogBox.openDialog();
			} else {
				this.showMetadata = false;
				this.$refs.dialogBox.closeDialog();
			}
		}
	}
};
</script>

<style lang="less">
@import '../../../../lib/wikimedia-ui-base.less';

.ext-wikilambda-tester-table {
	&-message-icon {
		cursor: pointer;
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

	&-dialog {
		position: fixed;
		z-index: 999;
		top: calc( 50% - 10px );
		left: calc( 50% - 10px );
		width: auto;
		max-width: 75%;
		height: auto;
		max-height: 75%;
		margin-left: -100px;
		margin-right: 100px;
		margin-bottom: 100px;
		overflow-x: auto;
		overflow-y: auto;
	}
}
</style>
