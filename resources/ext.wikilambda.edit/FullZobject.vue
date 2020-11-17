<template>
	<!--
		WikiLambda Vue interface module for generic ZObject manipulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zobject">
		<span>{{ z1k1label }} (Z1K1): </span>
		<span v-if="persistent">
			<a v-if="type !== zobjectId && viewmode" :href="'./ZObject:' + type">
				<span>{{ typeLabel }} ({{ type }})</span>
			</a>
			<span v-else>{{ typeLabel }} ({{ type }})</span>
			<span> {{ z2k1label }} (Z2K1): </span>
			<span> {{ zobjectId }} </span>
		</span>
		<span v-else>
			<span v-if="viewmode"> {{ typeLabel }} ({{ type }})</span>
			<type-selector v-else
				:type="type"
				@change="updateType"
			></type-selector>
		</span>
		<other-keys :zobject="zobject"
			:viewmode="viewmode"
			@input="updateZobject"
		></other-keys>
	</div>
</template>

<script>
var TypeSelector = require( './TypeSelector.vue' );

module.exports = {
	name: 'FullZobject',
	beforeCreate: function () { // Need to delay require of OtherKeys to avoid loop
		this.$options.components[ 'other-keys' ] = require( './OtherKeys.vue' );
	},
	props: [ 'zobject', 'persistent', 'viewmode' ],
	methods: {
		updateZobject: function ( newZobject ) {
			this.zobject = newZobject;
			this.$emit( 'input', this.zobject );
		},
		updateType: function ( newType ) {
			this.zobject.Z1K1 = newType;
			this.$emit( 'input', this.zobject );
		}
	},
	computed: {
		type: {
			get: function () {
				return this.zobject.Z1K1;
			}
		},
		typeLabel: {
			get: function () {
				var ztypes = mw.config.get( 'extWikilambdaEditingData' ).ztypes;
				return ztypes[ this.type ];
			}
		},
		zobjectId: {
			get: function () {
				return this.zobject.Z2K1;
			},
			set: function ( newValue ) {
				this.zobject.Z2K1 = newValue;
				this.$emit( 'input', this.zobject );
			}
		}
	},
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			zkeylabels = editingData.zkeylabels;

		return {
			z1k1label: zkeylabels.Z1K1,
			z2k1label: zkeylabels.Z2K1
		};
	},
	components: {
		'type-selector': TypeSelector
	}
};
</script>

<style lang="less">
.ext-wikilambda-zobject {
	background: #fff;
	outline: 2px dashed #808080;
	padding: 1em;
}
</style>
