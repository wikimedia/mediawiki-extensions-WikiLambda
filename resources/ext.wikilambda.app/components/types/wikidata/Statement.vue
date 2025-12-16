<!--
	WikiLambda Vue component for Z6003/Wikidata Statement.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div
		class="ext-wikilambda-app-wikidata-statement"
		data-testid="wikidata-statement">
		<!-- Collapsed summary view -->
		<div class="ext-wikilambda-app-wikidata-statement__read">
			<wl-z-object-to-string
				v-if="subjectValue"
				:key-path="`${ keyPath }.${ subjectKey }`"
				:object-value="subjectValue"
				:edit="edit"
			></wl-z-object-to-string>
			<span
				v-if="subjectValue && ( predicateValue || valueValue )"
				class="ext-wikilambda-app-wikidata-statement__separator"> - </span>
			<wl-z-object-to-string
				v-if="predicateValue"
				:key-path="`${ keyPath }.${ predicateKey }`"
				:object-value="predicateValue"
				:edit="edit"
			></wl-z-object-to-string>
			<span
				v-if="predicateValue && valueValue"
				class="ext-wikilambda-app-wikidata-statement__separator"> - </span>
			<wl-z-object-to-string
				v-if="valueValue"
				:key-path="`${ keyPath }.${ valueKey }`"
				:object-value="valueValue"
				:edit="edit"
			></wl-z-object-to-string>
		</div>
	</div>
</template>

<script>
const { defineComponent, computed } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const ZObjectToString = require( '../ZObjectToString.vue' );

module.exports = exports = defineComponent( {
	name: 'wl-wikidata-statement',
	components: {
		'wl-z-object-to-string': ZObjectToString
	},
	props: {
		keyPath: {
			type: String,
			required: true
		},
		objectValue: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		// Type prop is required by parent component interface but not used here
		// eslint-disable-next-line vue/no-unused-properties
		type: {
			type: String,
			required: true
		},
		// Expanded prop is required by parent component interface but not used here
		// eslint-disable-next-line vue/no-unused-properties
		expanded: {
			type: Boolean,
			required: true
		}
	},
	setup( props ) {
		// Constants
		const subjectKey = Constants.Z_WIKIDATA_STATEMENT_SUBJECT;
		const predicateKey = Constants.Z_WIKIDATA_STATEMENT_PREDICATE;
		const valueKey = Constants.Z_WIKIDATA_STATEMENT_VALUE;

		// Statement values
		/**
		 * Get subject value (Z6003K1)
		 */
		const subjectValue = computed( () => props.objectValue && props.objectValue[ subjectKey ] );

		/**
		 * Get predicate value (Z6003K2)
		 */
		const predicateValue = computed( () => props.objectValue && props.objectValue[ predicateKey ] );

		/**
		 * Get value value (Z6003K3)
		 */
		const valueValue = computed( () => props.objectValue && props.objectValue[ valueKey ] );

		return {
			subjectValue,
			predicateValue,
			valueValue,
			subjectKey,
			predicateKey,
			valueKey
		};
	},

	beforeCreate: function () {
		// Need to delay require of ZObjectKeyValue to avoid loop
		this.$options.components[ 'wl-z-object-key-value' ] = require( '../ZObjectKeyValue.vue' );
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-wikidata-statement {
	--line-height-current: calc( var( --line-height-content ) * 1em );

	.ext-wikilambda-app-wikidata-statement__read {
		display: flex;
		flex-wrap: wrap;
		box-sizing: border-box;
		min-height: @min-size-interactive-pointer;
		padding-top: calc( calc( @min-size-interactive-pointer - var( --line-height-current ) ) / 2 );
		word-break: break-word;
	}

	.ext-wikilambda-app-wikidata-statement__separator {
		margin: 0 @spacing-25;
		color: @color-subtle;
	}

	// Stack on mobile
	@media screen and ( max-width: @max-width-breakpoint-mobile ) {
		.ext-wikilambda-app-wikidata-statement__read {
			flex-direction: column;
			align-items: flex-start;
		}

		.ext-wikilambda-app-wikidata-statement__separator {
			display: none;
		}
	}

	// Stack when inside a small column
	.ext-wikilambda-app-col-6 & {
		.ext-wikilambda-app-wikidata-statement__read {
			flex-direction: column;
			align-items: flex-start;
		}

		.ext-wikilambda-app-wikidata-statement__separator {
			display: none;
		}
	}
}
</style>
