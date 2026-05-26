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
				:status="statusFlag"
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
					<button
						v-if="( hasMetadata || hasApiErrors ) && !isRunning"
						type="button"
						class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-report-item__footer-button"
						@click="emitTesterKeys"
					>
						{{ i18n( 'wikilambda-tester-details' ).text() }}
					</button>
					<button
						v-if="isPending && !isRunning"
						type="button"
						class="ext-wikilambda-app-button-reset ext-wikilambda-app-function-report-item__footer-button"
						@click="refreshTest"
					>
						{{ i18n( 'wikilambda-tester-refresh' ).text() }}
					</button>
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
const useTestResults = require( '../../../composables/useTestResults.js' );

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
		}
	},
	emits: [ 'set-keys' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Test results and status
		/**
		 * Whether the test for this function,
		 * tester and implementation is in flight.
		 *
		 * @return {boolean}
		 */
		const isRunning = computed( () => store.hasFlyingPromise(
			props.functionZid,
			props.testerZid,
			props.implementationZid
		) );

		// useTestResults composable:
		const {
			hasApiErrors,
			hasMetadata,
			isPending,
			statusFlag,
			statusMessage,
			statusIcon
		} = useTestResults( {
			functionZid: computed( () => props.functionZid ),
			testerZid: computed( () => props.testerZid ),
			implementationZid: computed( () => props.implementationZid ),
			fetching: isRunning,
			icons: {
				passed: icons.cdxIconSuccess,
				failed: icons.cdxIconClear,
				pending: icons.cdxIconClock
			}
		} );

		// Title
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

		// Actions
		/**
		 * Emits set-keys event with implementation and tester zids
		 */
		function emitTesterKeys() {
			emit( 'set-keys', {
				implementationZid: props.implementationZid,
				testerZid: props.testerZid
			} );
		}

		/**
		 * Refreshes test execution by calling the perform test
		 * api with the exact combination of function, test and
		 * implementation Zids
		 */
		function refreshTest() {
			store.getTestResults( {
				zFunctionId: props.functionZid,
				zTesters: [ props.testerZid ],
				zImplementations: [ props.implementationZid ],
				clearPreviousResults: true
			} );
		}

		return {
			emitTesterKeys,
			isPending,
			isRunning,
			hasApiErrors,
			hasMetadata,
			refreshTest,
			statusFlag,
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
		word-break: normal;
		overflow-wrap: anywhere;

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

	.ext-wikilambda-app-function-report-item__footer-button {
		.cdx-mixin-link();
	}
}
</style>
