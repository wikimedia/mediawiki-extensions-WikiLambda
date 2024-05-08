<!--
	WikiLambda Vue component for the details tab in the ZFunction Viewer.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-tester-table">
		<cdx-icon
			class="ext-wikilambda-tester-table__message-icon"
			:icon="statusIcon"
			:class="statusIconClass"
		></cdx-icon>
		<span class="ext-wikilambda-tester-table__message-status">
			{{ statusMessage }}
		</span>
		<cdx-icon
			v-if="testerStatus !== undefined"
			:icon="messageIcon"
			class="ext-wikilambda-tester-table__message-icon ext-wikilambda-tester-table__message-icon--info"
			@click.stop="handleMessageIconClick"
		></cdx-icon>
		<wl-function-metadata-dialog
			:open="showMetadata"
			:header-text="implementationLabel"
			:metadata="metadata"
			@close-dialog="showMetadata = false"
		></wl-function-metadata-dialog>
	</div>
</template>

<script>
const { defineComponent } = require( 'vue' );
const FunctionMetadataDialog = require( '../../widgets/FunctionMetadataDialog.vue' ),
	Constants = require( '../../../Constants.js' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../../lib/icons.json' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = exports = defineComponent( {
	name: 'wl-function-tester-table',
	components: {
		'cdx-icon': CdxIcon,
		'wl-function-metadata-dialog': FunctionMetadataDialog
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
	computed: Object.assign( mapGetters( [
		'getZTesterResults',
		'getZTesterMetadata',
		'getLabel'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		status: function () {
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return Constants.testerStatus.READY;
			}
			if ( this.testerStatus === true ) {
				return Constants.testerStatus.PASSED;
			}
			if ( this.testerStatus === false ) {
				return Constants.testerStatus.FAILED;
			}
			return Constants.testerStatus.RUNNING;
		},
		statusMessage: function () {
			switch ( this.status ) {
				case Constants.testerStatus.READY:
					return this.$i18n( 'wikilambda-tester-status-ready' ).text();
				case Constants.testerStatus.PASSED:
					return this.$i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.testerStatus.FAILED:
					return this.$i18n( 'wikilambda-tester-status-failed' ).text();
				default:
					return this.$i18n( 'wikilambda-tester-status-running' ).text();
			}
		},
		statusIcon: function () {
			if ( this.testerStatus === true ) {
				return icons.cdxIconCheck;
			}
			if ( this.testerStatus === false ) {
				return icons.cdxIconClose;
			}
			// This will be used both for ready and running statuses
			return icons.cdxIconAlert;
		},
		statusIconClass: function () {
			return `ext-wikilambda-function-report-item-status__${ this.status }`;
		},
		messageIcon: function () {
			return icons.cdxIconInfo;
		},
		metadata: function () {
			const metadata = this.getZTesterMetadata(
				this.zFunctionId, this.zTesterId, this.zImplementationId );

			// TODO (T316567): avoid returning ''
			return metadata || '';
		},
		implementationLabel: function () {
			return this.getLabel( this.zImplementationId );
		},
		testerLabel: function () {
			return this.getLabel( this.zTesterId );
		},
		tooltipMetaDataHelpLink: function () {
			return this.$i18n( 'wikilambda-helplink-tooltip' ).text();
		}
	} ),
	methods: {
		handleMessageIconClick: function () {
			// TODO (T315607): See if the metadata dialog behavior can be improved further.
			// TODO (T316567): Check if results are ready before showing metadata dialog
			if ( !this.showMetadata ) {
				this.showMetadata = true;
			} else {
				this.showMetadata = false;
			}
		}
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-tester-table {
	display: flex;

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
		&__ready {
			color: @color-disabled;
		}

		&__canceled {
			color: @color-subtle;
		}

		&__passed {
			color: @color-success;
		}

		&__failed {
			color: @color-error;
		}

		&__running {
			color: @color-warning;
		}
	}
}
</style>
