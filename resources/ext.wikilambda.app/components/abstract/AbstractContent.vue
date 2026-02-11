<!--
	WikiLambda Vue component for the Abstract Content object.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-abstract-content">
		<template #header>
			{{ i18n( 'wikilambda-abstract-content-object' ).text() }}
		</template>
		<template #header-action>
			<wl-abstract-publish v-if="edit"></wl-abstract-publish>
		</template>
		<template #main>
			<wl-abstract-content-section
				v-for="section in sections"
				:key="`${section.index}-${section.qid}`"
				:edit="edit"
				:section="section"
			></wl-abstract-content-section>
			<!-- FIXME: Stretch goal: add new sections -->
			<!-- <cdx-button
				v-if="edit"
				action="default"
				weight="primary"
				@click="console.log"
				>Add section</cdx-button>
			</cdx-button>-->
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );

// Abstract components
const AbstractContentSection = require( './AbstractContentSection.vue' );
const AbstractPublish = require( './AbstractPublish.vue' );
// Base components
const WidgetBase = require( '../base/WidgetBase.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-content',
	components: {
		'wl-abstract-content-section': AbstractContentSection,
		'wl-abstract-publish': AbstractPublish,
		'wl-widget-base': WidgetBase
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		}
	},
	setup() {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const sections = computed( () => store.getAbstractContentSections );

		return {
			i18n,
			sections
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-content {
	.ext-wikilambda-app-abstract-content__section {
		margin-bottom: @spacing-150;
	}

	.ext-wikilambda-app-abstract-content__section-title h2 span {
		font-size: @font-size-medium;
	}
}
</style>
