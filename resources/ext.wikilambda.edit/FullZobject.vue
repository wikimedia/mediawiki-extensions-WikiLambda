<template>
	<div class="ext-wikilambda-full_zobject_box">
		<span>{{ z1k1label }} (Z1K1): </span>
		<span v-if="persistent">
			<span>{{ typeLabel }} ({{ type }})</span>
			<span> {{ z2k1label }} (Z2K1): </span>
			<span> {{ zobjectId }} </span>
		</span>
		<span v-else>
			<select v-model="type">
				<option v-for="ztype in ztypes"
					:key="ztype"
					:value="ztype.value"
				>
					{{ ztype.label }} ({{ ztype.value }})
				</option>
			</select>
		</span>
		<other-keys :zobject="zobject" @input="updateZobject"></other-keys>
	</div>
</template>

<script>

module.exports = {
	name: 'FullZobject',
	beforeCreate: function () { // Need to delay require of OtherKeys to avoid loop
		this.$options.components[ 'other-keys' ] = require( './OtherKeys.vue' );
	},
	props: [ 'zobject', 'persistent' ],
	methods: {
		updateZobject: function ( newZobject ) {
			this.zobject = newZobject;
			this.$emit( 'input', this.zobject );
		}
	},
	computed: {
		type: {
			get: function () {
				return this.zobject.Z1K1;
			},
			set: function ( newValue ) {
				this.zobject.Z1K1 = newValue;
				this.$emit( 'input', this.zobject );
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
		var index,
			editingData = mw.config.get( 'extWikilambdaEditingData' ),
			zkeylabels = editingData.zkeylabels,
			typeoptions = [];

		for ( index in editingData.ztypes ) {
			typeoptions.push( {
				value: index,
				label: editingData.ztypes[ index ]
			} );
		}

		return {
			z1k1label: zkeylabels.Z1K1,
			z2k1label: zkeylabels.Z2K1,
			ztypes: typeoptions
		};
	}
};
</script>

<style lang="less">
.ext-wikilambda-full_zobject_box {
	outline: 2px dashed #808080;
}
</style>
