<template>
	<!--
		WikiLambda Vue component for displaying a result item of running
		a function's testers against its implementations or a funciton's
		implementations against its testers.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-function-report-item">
		<div class="ext-wikilambda-function-report-item__header">
			<cdx-icon
				:icon="statusIcon"
				:class="statusIconClass"
				size="small"
			></cdx-icon>
			<a
				:href="titleLink"
				class="ext-wikilambda-function-report-item__title"
				:class="{ 'ext-wikilambda-function-report-item__title--no-label': !titleLabelExists }"
			>{{ title }}
			</a>
		</div>

		<div class="ext-wikilambda-function-report-item__footer">
			<span class="ext-wikilambda-function-report-item__footer-status">
				{{ statusMessage }}
			</span>
			<a
				v-if="!isRunning"
				role="button"
				@click="emitTesterKeys"
			>{{ $i18n( 'wikilambda-tester-details' ).text() }}
			</a>
		</div>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	Constants = require( '../../Constants.js' ),
	icons = require( '../../../../lib/icons.json' );

// @vue/component
module.exports = exports = {
	name: 'wl-function-report-item',
	components: {
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
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
		},
		reportType: {
			type: String,
			default: Constants.Z_TESTER
		}
	},
	computed: $.extend( mapGetters( [
		'getZTesterResults',
		'getLabel'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		titleLabel: function () {
			return this.reportType === Constants.Z_TESTER ?
				this.getLabel( this.zImplementationId ) :
				this.getLabel( this.zTesterId );
		},
		titleLabelExists: function () {
			return this.titleLabel !== undefined;
		},
		title: function () {
			return this.titleLabelExists ? this.titleLabel : this.$i18n( 'wikilambda-editor-default-name' ).text();
		},
		titleLink: function () {
			const zid = this.reportType === Constants.Z_TESTER ? this.zImplementationId : this.zTesterId;
			return new mw.Title( zid ).getUrl();
		},
		status: function () {
			if ( !( this.zImplementationId ) || !( this.zTesterId ) ) {
				return Constants.testerStatus.PENDING;
			}
			if ( this.testerStatus === true ) {
				return Constants.testerStatus.PASSED;
			}
			if ( this.testerStatus === false ) {
				return Constants.testerStatus.FAILED;
			}
			return Constants.testerStatus.RUNNING;
		},
		isRunning: function () {
			return this.status === Constants.testerStatus.RUNNING;
		},
		statusMessage: function () {
			switch ( this.status ) {
				case Constants.testerStatus.PENDING:
					return this.$i18n( 'wikilambda-tester-status-pending' ).text();
				case Constants.testerStatus.PASSED:
					return this.$i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.testerStatus.FAILED:
					return this.$i18n( 'wikilambda-tester-status-failed' ).text();
				default:
					return this.$i18n( 'wikilambda-tester-status-running' ).text();
			}
		},
		statusIcon: function () {
			if ( this.status === Constants.testerStatus.PASSED ) {
				return icons.cdxIconSuccess;
			}
			if ( this.status === Constants.testerStatus.FAILED ) {
				return icons.cdxIconClear;
			}
			// This will be used both for pending and running statuses
			return icons.cdxIconClock;
		},
		statusIconClass: function () {
			if ( this.status === Constants.testerStatus.PASSED ) {
				return 'ext-wikilambda-function-report-item-status--PASS';
			}
			if ( this.status === Constants.testerStatus.FAILED ) {
				return 'ext-wikilambda-function-report-item-status--FAIL';
			}
			return 'ext-wikilambda-function-report-item-status--RUNNING';
		}
	} ),
	methods: {
		emitTesterKeys: function () {
			this.$emit( 'set-keys', {
				zImplementationId: this.zImplementationId,
				zTesterId: this.zTesterId
			} );
		}
	}
};
</script>

<style lang="less">
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-function-report-item {
	&__header {
		display: flex;
		align-items: flex-start;

		.cdx-icon {
			margin-top: @spacing-25;
		}
	}

	/* TODO: update with codex dark link when available */
	&__title {
		margin-left: @spacing-50;
		margin-right: 0;
		display: block;
		color: @color-base;
	}

	&__title:visited {
		color: @color-base;
	}

	&-status {
		&--PASS {
			color: @color-success;
		}

		&--FAIL {
			color: @color-error;
		}

		&--RUNNING {
			color: @color-warning;
		}
	}

	&__footer {
		margin-left: calc( @spacing-100 + @spacing-50 );

		&-status {
			color: @color-subtle;
			margin-right: @spacing-50;
		}
	}
}

.ext-wikilambda-function-report-item__title--no-label {
	&:link,
	&:visited {
		color: @color-placeholder;
	}
}
</style>
