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
		<wl-metadata-dialog
			:show-dialog="showMetadata"
			:implementation-label="implementationLabel"
			:tester-label="testerLabel"
			:metadata="metadata"
			@close-dialog="showMetadata = false"
		>
		</wl-metadata-dialog>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	MetadataDialog = require( './viewer/details/ZMetadataDialog.vue' ),
	icons = require( '../../../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	name: 'wl-z-function-tester-table',
	components: {
		'cdx-icon': CdxIcon,
		'wl-metadata-dialog': MetadataDialog
	},
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
		metadata: function () {
			const metadata = this.getZTesterMetadata(
				this.zFunctionId, this.zTesterId, this.zImplementationId );

			// TODO(T316567): avoid returning ''
			return metadata || '';
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
		}
	} )
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

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
			color: @color-success;
		}

		&--FAIL {
			color: @color-destructive;
		}

		&--RUNNING {
			color: @color-warning;
		}
	}
}
</style>
