<!--
	WikiLambda Vue component for the Abstract Content fragment preview.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div class="ext-wikilambda-app-abstract-preview-fragment">
		<cdx-progress-indicator v-if="!fragmentPreview || fragmentPreview.isLoading">
			{{ i18n( 'wikilambda-loading' ).text() }}
		</cdx-progress-indicator>
		<!-- eslint-disable vue/no-v-html -->
		<p
			v-else
			class="ext-wikilambda-app-abstract-preview-fragment-html"
			v-html="fragmentPreview.html"
		></p>
		<!-- eslint-enable vue/no-v-html -->
	</div>
</template>

<script>
const { computed, defineComponent, inject, onMounted, watch } = require( 'vue' );

const useMainStore = require( '../../store/index.js' );

// Codex components
const { CdxProgressIndicator } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-abstract-preview-fragment',
	components: {
		'cdx-progress-indicator': CdxProgressIndicator
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		}
	},
	setup( props ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		const dateForToday = computed( () => {
			const today = new Date();
			const d = today.getDate();
			const m = today.getMonth() + 1;
			const yyyy = today.getFullYear();
			return `${ d }-${ m }-${ yyyy }`;
		} );

		const fragmentPreview = computed( () => store.getRenderedFragment( props.keyPath ) );

		const fragmentDirty = computed( () => fragmentPreview.value && fragmentPreview.value.isDirty );

		function renderPreview() {
			store.renderFragmentPreview( {
				keyPath: props.keyPath,
				fragment: props.fragment,
				qid: store.getAbstractWikiId,
				date: dateForToday.value,
				// FIXME: get language
				language: 'Z1002'
			} );
		}

		// Watchers
		watch( fragmentDirty, ( isDirty ) => {
			if ( isDirty ) {
				renderPreview();
			}
		}, { immediate: true } );

		// Lifecycle hooks
		onMounted( () => {
			renderPreview();
		} );

		return {
			fragmentPreview,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-abstract-preview-fragment {
	/* something */
}
</style>
