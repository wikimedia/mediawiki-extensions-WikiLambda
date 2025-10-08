<!--
	WikiLambda Vue component that renders the expanded view toggle icon.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<cdx-button
		weight="quiet"
		:aria-label="i18n( 'wikilambda-toggle-expanded-view' ).text()"
		class="ext-wikilambda-app-expanded-toggle"
		:disabled="!hasExpandedMode"
		data-testid="expanded-toggle"
		@click="waitAndExpand"
	>
		<cdx-icon
			class="ext-wikilambda-app-expanded-toggle__icon"
			:class="iconClass"
			:size="hasExpandedMode ? 'small' : 'medium'"
			:icon="hasExpandedMode ? iconExpand : iconBullet"
		></cdx-icon>
	</cdx-button>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );
const icons = require( '../../../lib/icons.json' );

// Codex components
const { CdxButton, CdxIcon } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-expanded-toggle',
	components: {
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon
	},
	props: {
		expanded: {
			type: Boolean,
			required: true
		},
		hasExpandedMode: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'toggle-expand' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const iconExpand = icons.cdxIconExpand;
		const iconBullet = {
			path: 'M8 8h4v4H8z'
		};

		/**
		 * Returns the icon class based on expanded state
		 *
		 * @return {string}
		 */
		const iconClass = computed( () => {
			if ( !props.hasExpandedMode ) {
				return 'ext-wikilambda-app-expanded-toggle__icon--disabled';
			} else {
				return props.expanded ?
					'ext-wikilambda-app-expanded-toggle__icon--expanded' :
					'ext-wikilambda-app-expanded-toggle__icon--collapsed';
			}
		} );

		/**
		 * Emits the toggle-expand event
		 *
		 * @param {Event} event
		 */
		const clickExpandToggle = ( event ) => {
			emit( 'toggle-expand', event );
		};

		/**
		 * Waits for running parsers then emits toggle event
		 *
		 * @param {Event} event
		 */
		const waitAndExpand = ( event ) => {
			store.waitForRunningParsers.then( () => clickExpandToggle( event ) );
		};

		return {
			iconBullet,
			iconClass,
			iconExpand,
			waitAndExpand,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-expanded-toggle {
	padding: 0;

	.ext-wikilambda-app-expanded-toggle__icon {
		padding: 0;
		color: @color-subtle;
		transition: transform @transition-duration-medium @transition-timing-function-system;

		@media ( prefers-reduced-motion ) {
			transition: transform 0ms unset;
		}

		&.cdx-icon {
			color: @color-subtle;
		}

		&--collapsed.cdx-icon {
			transform: rotate( -90deg );
		}
	}
}

[ dir='rtl' ] {
	.ext-wikilambda-app-expanded-toggle {
		.ext-wikilambda-app-expanded-toggle__icon--collapsed.cdx-icon {
			transform: rotate( 90deg );
		}
	}
}
</style>
