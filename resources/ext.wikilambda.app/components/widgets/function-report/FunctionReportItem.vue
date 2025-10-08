<!--
	WikiLambda Vue component for displaying a result item of running
	a function's testers against its implementations or a funciton's
	implementations against its testers.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-function-report-item">
		<div class="ext-wikilambda-app-function-report-item__content">
			<wl-status-icon
				class="ext-wikilambda-app-function-report-item__icon"
				size="small"
				:status="status"
				:status-icon="statusIcon"
			></wl-status-icon>
			<div class="ext-wikilambda-app-function-report-item__text">
				<a
					:href="titleLink"
					class="ext-wikilambda-app-function-report-item__title"
					:class="{ 'ext-wikilambda-app-function-report-item__title--no-label': titleLabelData.isUntitled }"
					:lang="titleLabelData.langCode"
					:dir="titleLabelData.langDir"
				>{{ titleLabelData.labelOrUntitled }}</a>
				<div class="ext-wikilambda-app-function-report-item__footer">
					<span class="ext-wikilambda-app-function-report-item__footer-status">
						{{ statusMessage }}
					</span>
					<a
						v-if="!isRunning && status !== 'ready'"
						role="button"
						@click="emitTesterKeys"
					>{{ i18n( 'wikilambda-tester-details' ).text() }}
					</a>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const useMainStore = require( '../../../store/index.js' );
const urlUtils = require( '../../../utils/urlUtils.js' );

// Base components
const StatusIcon = require( '../../base/StatusIcon.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-function-report-item',
	components: {
		'wl-status-icon': StatusIcon
	},
	props: {
		functionZid: {
			type: String,
			required: true
		},
		implementationZid: {
			type: String,
			required: true
		},
		testerZid: {
			type: String,
			required: true
		},
		contentType: {
			type: String,
			default: Constants.Z_TESTER
		},
		fetching: {
			type: Boolean,
			default: false
		}
	},
	emits: [ 'set-keys' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		/**
		 * Returns the label data for the item title
		 *
		 * @return {LabelData}
		 */
		const titleLabelData = computed( () => props.contentType === Constants.Z_TESTER ?
			store.getLabelData( props.implementationZid ) :
			store.getLabelData( props.testerZid ) );

		/**
		 * Returns the link for the reported item
		 *
		 * @return {string}
		 */
		const titleLink = computed( () => {
			const zid = props.contentType === Constants.Z_TESTER ? props.implementationZid : props.testerZid;
			return urlUtils.generateViewUrl( { langCode: store.getUserLangCode, zid } );
		} );

		/**
		 * Returns whether the tester passed
		 *
		 * @return {boolean}
		 */
		const testerStatus = computed( () => store.getZTesterResult(
			props.functionZid,
			props.testerZid,
			props.implementationZid
		) );

		/**
		 * Returns the status of the test
		 *
		 * @return {string}
		 */
		const status = computed( () => {
			if ( props.fetching ) {
				return Constants.TESTER_STATUS.RUNNING;
			}
			if ( !( props.implementationZid ) || !( props.testerZid ) ) {
				return Constants.TESTER_STATUS.READY;
			}
			if ( testerStatus.value === true ) {
				return Constants.TESTER_STATUS.PASSED;
			}
			if ( testerStatus.value === false ) {
				return Constants.TESTER_STATUS.FAILED;
			}
			return Constants.TESTER_STATUS.READY;
		} );

		/**
		 * Returns the status message
		 *
		 * @return {string}
		 */
		const statusMessage = computed( () => {
			switch ( status.value ) {
				case Constants.TESTER_STATUS.READY:
					return i18n( 'wikilambda-tester-status-ready' ).text();
				case Constants.TESTER_STATUS.PASSED:
					return i18n( 'wikilambda-tester-status-passed' ).text();
				case Constants.TESTER_STATUS.FAILED:
					return i18n( 'wikilambda-tester-status-failed' ).text();
				default:
					return i18n( 'wikilambda-tester-status-running' ).text();
			}
		} );

		/**
		 * Returns the icon depending on the status
		 *
		 * @return {Object}
		 */
		const statusIcon = computed( () => {
			if ( status.value === Constants.TESTER_STATUS.PASSED ) {
				return icons.cdxIconSuccess;
			}
			if ( status.value === Constants.TESTER_STATUS.FAILED ) {
				return icons.cdxIconClear;
			}
			// This will be used both for ready and running statuses
			return icons.cdxIconClock;
		} );

		/**
		 * Returns whether the tester is currently running
		 *
		 * @return {boolean}
		 */
		const isRunning = computed( () => status.value === Constants.TESTER_STATUS.RUNNING );

		/**
		 * Emits set-keys event with implementation and tester zids
		 */
		const emitTesterKeys = () => {
			emit( 'set-keys', {
				implementationZid: props.implementationZid,
				testerZid: props.testerZid
			} );
		};

		return {
			emitTesterKeys,
			isRunning,
			status,
			statusIcon,
			statusMessage,
			titleLabelData,
			titleLink,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-report-item {
	.ext-wikilambda-app-function-report-item__content {
		display: flex;
		align-items: flex-start;

		.cdx-icon {
			margin-top: @spacing-25;
		}
	}

	.ext-wikilambda-app-function-report-item__icon {
		flex-shrink: 0;
	}

	.ext-wikilambda-app-function-report-item__text {
		margin-left: @spacing-50;
	}

	/* TODO (T406158): Update with codex dark link when available */
	.ext-wikilambda-app-function-report-item__title {
		margin-right: 0;
		display: block;
		color: @color-base;
		word-break: break-word;

		&:visited {
			color: @color-base;
		}

		&--no-label {
			&:link,
			&:visited {
				color: @color-placeholder;
			}
		}
	}

	.ext-wikilambda-app-function-report-item__footer-status {
		color: @color-subtle;
		margin-right: @spacing-50;
	}
}
</style>
